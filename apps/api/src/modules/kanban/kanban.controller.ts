import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { handleError } from "../../utils/errors.js";

function requireCompanyContext(req: Request, res: Response): { companyId: string; companyRole?: string; userId?: string; userRole?: string } | null {
  const companyId = req.companyId;
  if (!companyId) {
    res.status(400).json({ error: "Empresa não selecionada" });
    return null;
  }
  return {
    companyId,
    companyRole: req.companyRole,
    userId: req.user?.userId,
    userRole: req.user?.role,
  };
}

async function ensureCompanyMember(companyId: string, userId?: string) {
  if (!userId) {
    throw Object.assign(new Error("Não autenticado"), { statusCode: 401 });
  }

  const membership = await prisma.companyUser.findUnique({
    where: {
      companyId_userId: {
        companyId,
        userId,
      },
    },
  });

  if (!membership) {
    throw Object.assign(new Error("Usuário não pertence à empresa"), { statusCode: 403 });
  }

  return membership;
}

async function ensureProjectInCompany(projectId: string, companyId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true, ownerId: true },
  });

  if (!project) {
    throw Object.assign(new Error("Projeto não encontrado"), { statusCode: 404 });
  }

  return project;
}

async function ensureColumnInCompany(columnId: string, companyId: string) {
  const column = await prisma.kanbanColumn.findFirst({
    where: { id: columnId, project: { companyId } },
    select: {
      id: true,
      projectId: true,
      project: {
        select: { ownerId: true, companyId: true },
      },
    },
  });

  if (!column) {
    throw Object.assign(new Error("Coluna não encontrada"), { statusCode: 404 });
  }

  return column;
}

function isCompanyAdmin(role?: string) {
  return role === "OWNER" || role === "ADMIN";
}

async function canManageProjectColumns(
  userId: string | undefined,
  companyId: string,
  projectId: string,
  companyRole?: string,
  userRole?: string
): Promise<boolean> {
  if (!userId) return false;

  if (userRole === "ADMIN") return true;
  if (isCompanyAdmin(companyRole)) return true;

  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { ownerId: true },
  });

  if (!project) {
    return false;
  }

  if (project.ownerId === userId) {
    return true;
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    select: { role: true, project: { select: { companyId: true } } },
  });

  if (membership?.project?.companyId !== companyId) {
    return false;
  }

  return membership?.role === "PROJECT_MANAGER";
}

export async function getColumns(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const membership = await ensureCompanyMember(context.companyId, context.userId);

    const { projectId } = req.params;

    await ensureProjectInCompany(projectId, context.companyId);

    const columns = await prisma.kanbanColumn.findMany({
      where: { projectId, project: { companyId: context.companyId } },
      orderBy: { order: "asc" },
    });

    res.json(columns);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function createColumn(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const { projectId } = req.params;
    const { title, status, order } = req.body as { title: string; status: string; order?: number };

    await ensureCompanyMember(context.companyId, context.userId);
    await ensureProjectInCompany(projectId, context.companyId);

    const canManage = await canManageProjectColumns(
      context.userId,
      context.companyId,
      projectId,
      context.companyRole,
      context.userRole
    );

    if (!canManage) {
      return res.status(403).json({ error: "Você não tem permissão para criar colunas neste projeto" });
    }

    const column = await prisma.kanbanColumn.create({
      data: {
        projectId,
        title,
        status,
        order: order ?? 0,
      },
    });

    res.status(201).json(column);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function updateColumn(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const { id } = req.params;
    const { title, status, order } = req.body as { title?: string; status?: string; order?: number };

    await ensureCompanyMember(context.companyId, context.userId);
    const column = await ensureColumnInCompany(id, context.companyId);

    const canManage = await canManageProjectColumns(
      context.userId,
      context.companyId,
      column.projectId,
      context.companyRole,
      context.userRole
    );

    if (!canManage) {
      return res.status(403).json({ error: "Você não tem permissão para atualizar esta coluna" });
    }

    const updated = await prisma.kanbanColumn.update({
      where: { id: column.id },
      data: {
        title: title ?? undefined,
        status: status ?? undefined,
        order: order ?? undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function deleteColumn(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    await ensureCompanyMember(context.companyId, context.userId);
    const column = await ensureColumnInCompany(req.params.id, context.companyId);

    const canManage = await canManageProjectColumns(
      context.userId,
      context.companyId,
      column.projectId,
      context.companyRole,
      context.userRole
    );

    if (!canManage) {
      return res.status(403).json({ error: "Você não tem permissão para remover esta coluna" });
    }

    await prisma.kanbanColumn.delete({ where: { id: column.id } });
    res.status(204).send();
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

