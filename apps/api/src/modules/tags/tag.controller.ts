import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateTagSchema, UpdateTagSchema, AddTagToTaskSchema } from "./tag.model.js";
import { handleError } from "../../utils/errors.js";
import { logCreate, logUpdate, logDelete } from "../../services/activityLogger.js";

function requireCompanyContext(req: Request, res: Response): { companyId: string; companyRole: string | undefined } | null {
  const companyId = req.companyId;
  if (!companyId) {
    res.status(400).json({ error: "Empresa não selecionada" });
    return null;
  }
  return { companyId, companyRole: req.companyRole };
}

function isCompanyAdmin(companyRole?: string) {
  return companyRole === "OWNER" || companyRole === "ADMIN";
}

/**
 * Lista tags de um projeto ou tags globais
 */
export async function getTags(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const { projectId } = req.query as { projectId?: string };
    const where: any = { companyId: context.companyId };

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, companyId: context.companyId },
        select: { id: true },
      });
      if (!project) {
        return res.status(404).json({ error: "Projeto não encontrado" });
      }
      where.projectId = projectId;
    } else {
      where.projectId = null;
    }

    const tags = await prisma.tag.findMany({
      where,
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json(tags);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Cria uma nova tag
 */
export async function createTag(req: Request, res: Response) {
  try {
     const userId = req.user?.userId;
     if (!userId) {
       return res.status(401).json({ error: "Unauthorized" });
     }
 
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const parse = CreateTagSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { companyId, companyRole } = context;
    const isCompanyAdminFlag = isCompanyAdmin(companyRole);
    // Se projectId foi fornecido, verificar se o projeto existe e se o usuário tem permissão
    if (parse.data.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: parse.data.projectId, companyId },
        include: {
          owner: { select: { id: true } },
          members: { select: { userId: true, role: true } },
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const isOwner = project.ownerId === userId;
      const isProjectManager = project.members.some(
        (m) => m.userId === userId && m.role === "PROJECT_MANAGER"
      );

      if (!isCompanyAdminFlag && !isOwner && !isProjectManager) {
        return res.status(403).json({ error: "Forbidden" });
      }
    } else {
      if (!isCompanyAdminFlag) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const tag = await prisma.tag.create({
      data: {
        name: parse.data.name,
        color: parse.data.color || "#6366f1",
        projectId: parse.data.projectId || null,
        companyId,
      },
    });

    // Log da criação
    logCreate(userId, companyId, "Tag", tag.id, tag).catch(console.error);

    res.status(201).json(tag);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Atualiza uma tag
 */
export async function updateTag(req: Request, res: Response) {
  try {
     const userId = req.user?.userId;
     if (!userId) {
       return res.status(401).json({ error: "Unauthorized" });
     }

    const context = requireCompanyContext(req, res);
    if (!context) return;
 
    const parse = UpdateTagSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }
 
    const oldTag = await prisma.tag.findFirst({
      where: { id: req.params.id, companyId: context.companyId },
      include: {
        project: {
          include: {
            owner: { select: { id: true } },
            members: { select: { userId: true, role: true } },
          },
        },
      },
    });

    if (!oldTag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    // Verificar permissões
    const isAdmin = isCompanyAdmin(context.companyRole);
    const isProjectOwner = oldTag.project?.ownerId === userId;
    const isProjectManager = oldTag.project?.members.some(
      (m) => m.userId === userId && m.role === "PROJECT_MANAGER"
    );

    // Tags globais só podem ser editadas por admin
    if (!oldTag.projectId && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Tags de projeto podem ser editadas por admin, dono ou gerente
    if (oldTag.projectId && !isAdmin && !isProjectOwner && !isProjectManager) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (parse.data.projectId && parse.data.projectId !== oldTag.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: parse.data.projectId, companyId: context.companyId },
        select: { id: true },
      });
      if (!project) {
        return res.status(404).json({ error: "Projeto informado não encontrado" });
      }
    }

    const tag = await prisma.tag.update({
      where: { id: req.params.id },
      data: parse.data,
    });

    // Log da atualização
    logUpdate(userId, context.companyId, "Tag", tag.id, oldTag, tag).catch(console.error);

    res.json(tag);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Deleta uma tag
 */
export async function deleteTag(req: Request, res: Response) {
  try {
     const userId = req.user?.userId;
     if (!userId) {
       return res.status(401).json({ error: "Unauthorized" });
     }

    const context = requireCompanyContext(req, res);
    if (!context) return;
 
    const tag = await prisma.tag.findFirst({
      where: { id: req.params.id, companyId: context.companyId },
      include: {
        project: {
          include: {
            owner: { select: { id: true } },
            members: { select: { userId: true, role: true } },
          },
        },
      },
    });

    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    // Verificar permissões
    const isAdmin = isCompanyAdmin(context.companyRole);
    const isProjectOwner = tag.project?.ownerId === userId;
    const isProjectManager = tag.project?.members.some(
      (m) => m.userId === userId && m.role === "PROJECT_MANAGER"
    );

    // Tags globais só podem ser deletadas por admin
    if (!tag.projectId && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Tags de projeto podem ser deletadas por admin, dono ou gerente
    if (tag.projectId && !isAdmin && !isProjectOwner && !isProjectManager) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.tag.delete({
      where: { id: req.params.id },
    });

    // Log da exclusão
    logDelete(userId, context.companyId, "Tag", tag.id, tag).catch(console.error);

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Lista tags de uma tarefa
 */
export async function getTaskTags(req: Request, res: Response) {
  try {
     const { taskId } = req.params;
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const task = await prisma.task.findFirst({
      where: { id: taskId, project: { companyId: context.companyId } },
      select: { id: true },
    });

    if (!task) {
      return res.status(404).json({ error: "Tarefa não encontrada" });
    }
 
     const taskTags = await prisma.taskTag.findMany({
      where: { taskId, tag: { companyId: context.companyId } },
      include: {
        tag: true,
      },
    });

    res.json(taskTags.map((tt) => tt.tag));
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Adiciona uma tag a uma tarefa
 */
export async function addTagToTask(req: Request, res: Response) {
  try {
     const userId = req.user?.userId;
     if (!userId) {
       return res.status(401).json({ error: "Unauthorized" });
     }
 
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const { taskId } = req.params;
    const parse = AddTagToTaskSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }
 
     // Verificar se a tarefa existe
    const task = await prisma.task.findFirst({
      where: { id: taskId, project: { companyId: context.companyId } },
    });
 
     if (!task) {
       return res.status(404).json({ error: "Task not found" });
     }
 
     // Verificar se a tag existe e pertence ao mesmo projeto (ou é global)
    const tag = await prisma.tag.findFirst({
      where: { id: parse.data.tagId, companyId: context.companyId },
    });
 
     if (!tag) {
       return res.status(404).json({ error: "Tag not found" });
     }
 
     // Verificar se a tag pertence ao projeto ou é global
    if (tag.projectId && tag.projectId !== task.projectId) {
      return res.status(400).json({ error: "Tag não pertence a este projeto" });
    }
 
     // Criar associação (ignorar se já existir devido ao unique constraint)
    try {
      const taskTag = await prisma.taskTag.create({
        data: {
          taskId,
          tagId: parse.data.tagId,
        },
        include: {
          tag: true,
        },
      });
 
      res.status(201).json(taskTag.tag);
    } catch (error: any) {
      if (error.code === "P2002") {
        // Duplicata - tag já está associada
        const existingTag = await prisma.tag.findFirst({
          where: { id: parse.data.tagId, companyId: context.companyId },
        });
        return res.status(200).json(existingTag);
      }
      throw error;
    }
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Remove uma tag de uma tarefa
 */
export async function removeTagFromTask(req: Request, res: Response) {
  try {
     const userId = req.user?.userId;
     if (!userId) {
       return res.status(401).json({ error: "Unauthorized" });
     }
 
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const { taskId, tagId } = req.params;
 
     // Verificar se a associação existe e deletar
     const taskTag = await prisma.taskTag.findFirst({
       where: {
         taskId,
         tagId,
         task: { project: { companyId: context.companyId } },
         tag: { companyId: context.companyId },
       },
     });
 
     if (!taskTag) {
       return res.status(404).json({ error: "Tag não está associada a esta tarefa" });
     }
 
     await prisma.taskTag.delete({
       where: {
         id: taskTag.id,
       },
     });
 
     res.status(204).send();
   } catch (error) {
     handleError(error, res);
   }
}

