import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateTemplateSchema, UpdateTemplateSchema } from "./template.model.js";
import { handleError } from "../../utils/errors.js";

function requireCompanyContext(req: Request, res: Response) {
  const companyId = req.companyId;
  if (!companyId) {
    res.status(400).json({ error: "Empresa não selecionada" });
    return null;
  }
  return { companyId, companyRole: req.companyRole, userId: req.user?.userId };
}

function isCompanyAdmin(role?: string) {
  return role === "OWNER" || role === "ADMIN";
}

async function ensureMembership(companyId: string, userId?: string) {
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

async function ensureTemplateAccess(templateId: string, companyId: string) {
  const template = await prisma.projectTemplate.findFirst({
    where: {
      id: templateId,
      OR: [{ companyId }, { isSystem: true }],
    },
  });

  if (!template) {
    throw Object.assign(new Error("Template não encontrado"), { statusCode: 404 });
  }

  return template;
}

async function ensureProjectInCompany(projectId: string, companyId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    include: {
      columns: {
        orderBy: { order: "asc" },
      },
      tasks: {
        include: {
          assignee: {
            select: { id: true, name: true },
          },
          sprint: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
      sprints: {
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!project) {
    throw Object.assign(new Error("Projeto não encontrado"), { statusCode: 404 });
  }

  return project;
}

/**
 * Lista todos os templates (sistema + usuário)
 */
export async function getTemplates(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    await ensureMembership(context.companyId, context.userId);

    const templates = await prisma.projectTemplate.findMany({
      where: {
        OR: [{ isSystem: true }, { companyId: context.companyId }],
      },
      orderBy: [
        { isSystem: "desc" },
        { createdAt: "desc" },
      ],
    });

    res.json(templates);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Busca um template específico
 */
export async function getTemplate(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    await ensureMembership(context.companyId, context.userId);

    const template = await ensureTemplateAccess(req.params.id, context.companyId);

    res.json(template);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Cria um novo template
 */
export async function createTemplate(req: Request, res: Response) {
  try {
    const parse = CreateTemplateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    const data = parse.data;

    const context = requireCompanyContext(req, res);
    if (!context) return;

    await ensureMembership(context.companyId, userId);

    const template = await prisma.projectTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        structure: data.structure,
        createdBy: userId,
        companyId: context.companyId,
        isSystem: false,
      },
    });

    res.status(201).json(template);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Atualiza um template
 */
export async function updateTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const parse = UpdateTemplateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const context = requireCompanyContext(req, res);
    if (!context) return;

    const template = await ensureTemplateAccess(id, context.companyId);
    await ensureMembership(context.companyId, context.userId);

    // Templates do sistema não podem ser atualizados
    if (template.isSystem) {
      return res.status(403).json({ error: "Templates do sistema não podem ser modificados" });
    }

    const userId = context.userId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (template.createdBy !== userId && !isCompanyAdmin(context.companyRole)) {
      return res.status(403).json({ error: "Você não tem permissão para editar este template" });
    }

    const updated = await prisma.projectTemplate.update({
      where: { id },
      data: parse.data,
    });

    res.json(updated);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Deleta um template
 */
export async function deleteTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const context = requireCompanyContext(req, res);
    if (!context) return;

    const template = await ensureTemplateAccess(id, context.companyId);
    await ensureMembership(context.companyId, context.userId);

    // Templates do sistema não podem ser deletados
    if (template.isSystem) {
      return res.status(403).json({ error: "Templates do sistema não podem ser deletados" });
    }

    const userId = context.userId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (template.createdBy !== userId && !isCompanyAdmin(context.companyRole)) {
      return res.status(403).json({ error: "Você não tem permissão para deletar este template" });
    }

    await prisma.projectTemplate.delete({
      where: { id },
    });

    res.json({ message: "Template deletado com sucesso" });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Converte um projeto em template
 */
export async function convertProjectToTemplate(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Nome do template é obrigatório" });
    }

    const context = requireCompanyContext(req, res);
    if (!context) return;

    await ensureMembership(context.companyId, req.user?.userId);

    const project = await ensureProjectInCompany(projectId, context.companyId);

    // Criar estrutura do template
    const structure = {
      defaultHourlyRate: project.defaultHourlyRate,
      columns: project.columns.map((col) => ({
        title: col.title,
        status: col.status,
        order: col.order,
      })),
      tasks: project.tasks.map((task) => ({
        title: task.title,
        description: task.description,
        status: task.status,
        estimateHours: task.estimateHours,
        order: task.order,
        sprintName: task.sprint?.name || null, // Incluir nome do sprint para mapeamento
      })),
      sprints: project.sprints.map((sprint) => ({
        name: sprint.name,
        goal: sprint.goal,
        duration: Math.ceil(
          (new Date(sprint.endDate).getTime() - new Date(sprint.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ), // Duração em dias
      })),
    };

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    const template = await prisma.projectTemplate.create({
      data: {
        name,
        description: description || `Template criado a partir do projeto "${project.name}"`,
        structure,
        createdBy: userId,
        companyId: context.companyId,
        isSystem: false,
      },
    });

    res.status(201).json(template);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Cria um projeto a partir de um template
 */
export async function createProjectFromTemplate(req: Request, res: Response) {
  try {
    const { templateId } = req.params;
    const { name, description, ownerId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Nome do projeto é obrigatório" });
    }

    const context = requireCompanyContext(req, res);
    if (!context) return;

    const template = await ensureTemplateAccess(templateId, context.companyId);
    await ensureMembership(context.companyId, req.user?.userId);

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    const projectOwnerId = ownerId || userId;

    if (projectOwnerId !== userId) {
      const ownerMembership = await prisma.companyUser.findUnique({
        where: {
          companyId_userId: {
            companyId: context.companyId,
            userId: projectOwnerId,
          },
        },
      });

      if (!ownerMembership) {
        return res.status(400).json({ error: "Owner informado não pertence à empresa" });
      }
    }

    const structure = template.structure as any;

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name,
        description: description || template.description || undefined,
        defaultHourlyRate: structure.defaultHourlyRate
          ? parseFloat(structure.defaultHourlyRate.toString())
          : undefined,
        ownerId: projectOwnerId,
        companyId: context.companyId,
      },
    });

    // Criar colunas
    if (structure.columns && Array.isArray(structure.columns)) {
      await prisma.kanbanColumn.createMany({
        data: structure.columns.map((col: any, index: number) => ({
          projectId: project.id,
          title: col.title,
          status: col.status,
          order: col.order !== undefined ? col.order : index,
        })),
      });
    }

    // Criar sprints
    const sprintMap = new Map<string, string>();
    if (structure.sprints && Array.isArray(structure.sprints)) {
      for (const sprintTemplate of structure.sprints) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + (sprintTemplate.duration || 14));

        const sprint = await prisma.sprint.create({
          data: {
            projectId: project.id,
            name: sprintTemplate.name,
            goal: sprintTemplate.goal || undefined,
            startDate,
            endDate,
          },
        });

        sprintMap.set(sprintTemplate.name, sprint.id);
      }
    }

    // Criar tarefas
    if (structure.tasks && Array.isArray(structure.tasks)) {
      for (const taskTemplate of structure.tasks) {
        await prisma.task.create({
          data: {
            projectId: project.id,
            title: taskTemplate.title,
            description: taskTemplate.description || undefined,
            status: taskTemplate.status || "BACKLOG",
            estimateHours: taskTemplate.estimateHours || 0,
            order: taskTemplate.order !== undefined ? taskTemplate.order : 0,
            sprintId: taskTemplate.sprintName
              ? sprintMap.get(taskTemplate.sprintName) || undefined
              : undefined,
          },
        });
      }
    }

    const createdProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        columns: true,
        tasks: true,
        sprints: true,
      },
    });

    res.status(201).json(createdProject);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

