import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { handleError } from "../../utils/errors.js";
import { z } from "zod";

const AddMemberSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["PROJECT_MANAGER", "MEMBER"]).default("MEMBER"),
});

const UpdateMemberSchema = z.object({
  role: z.enum(["PROJECT_MANAGER", "MEMBER"]),
});

// Verificar se o usuário tem permissão para gerenciar o projeto
async function canManageProject(userId: string, userRole: string, projectId: string): Promise<boolean> {
  // ADMIN pode gerenciar qualquer projeto
  if (userRole === "ADMIN") return true;

  // Verificar se é o dono do projeto
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (project?.ownerId === userId) return true;

  // Verificar se é gerente do projeto
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (membership?.role === "PROJECT_MANAGER") return true;

  // MANAGER global também pode gerenciar (se tiver role MANAGER)
  if (userRole === "MANAGER") return true;

  return false;
}

// Listar membros do projeto
export async function getProjectMembers(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verificar se tem permissão para ver membros
    if (!(await canManageProject(userId, userRole, projectId))) {
      return res.status(403).json({ error: "Você não tem permissão para ver membros deste projeto" });
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            hourlyRate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Incluir o dono do projeto
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            hourlyRate: true,
          },
        },
      },
    });

    const allMembers = [
      {
        id: `owner-${project?.owner.id}`,
        projectId,
        userId: project?.owner.id,
        role: "OWNER" as const,
        user: project?.owner,
        createdAt: project?.createdAt,
        updatedAt: project?.updatedAt,
      },
      ...members.map((m) => ({
        ...m,
        role: m.role as "PROJECT_MANAGER" | "MEMBER",
      })),
    ];

    res.json(allMembers);
  } catch (error) {
    handleError(error, res);
  }
}

// Adicionar membro ao projeto
export async function addProjectMember(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verificar permissão
    if (!(await canManageProject(userId, userRole, projectId))) {
      return res.status(403).json({ error: "Você não tem permissão para adicionar membros a este projeto" });
    }

    const parse = AddMemberSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { userId: newMemberId, role } = parse.data;

    // Verificar se o usuário já é membro
    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: newMemberId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: "Usuário já é membro deste projeto" });
    }

    // Verificar se está tentando adicionar o dono
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (project?.ownerId === newMemberId) {
      return res.status(400).json({ error: "O dono do projeto já está automaticamente incluído" });
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: newMemberId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            hourlyRate: true,
          },
        },
      },
    });

    res.status(201).json(member);
  } catch (error) {
    handleError(error, res);
  }
}

// Atualizar role do membro
export async function updateProjectMember(req: Request, res: Response) {
  try {
    const { projectId, memberId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verificar permissão
    if (!(await canManageProject(userId, userRole, projectId))) {
      return res.status(403).json({ error: "Você não tem permissão para atualizar membros deste projeto" });
    }

    const parse = UpdateMemberSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const member = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role: parse.data.role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            hourlyRate: true,
          },
        },
      },
    });

    res.json(member);
  } catch (error) {
    handleError(error, res);
  }
}

// Remover membro do projeto
export async function removeProjectMember(req: Request, res: Response) {
  try {
    const { projectId, memberId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verificar permissão
    if (!(await canManageProject(userId, userRole, projectId))) {
      return res.status(403).json({ error: "Você não tem permissão para remover membros deste projeto" });
    }

    await prisma.projectMember.delete({
      where: { id: memberId },
    });

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

