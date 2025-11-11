import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateCommentSchema, UpdateCommentSchema } from "./comment.model.js";
import { handleError } from "../../utils/errors.js";
import { logCreate, logUpdate, logDelete } from "../../services/activityLogger.js";
import { createNotificationsForUsers } from "../../services/notificationService.js";
import { triggerWebhooks } from "../../services/webhookService.js";
import { WEBHOOK_EVENTS } from "../webhooks/webhook.model.js";

function getCompanyOrReject(req: Request, res: Response): string | null {
  const companyId = req.companyId;
  if (!companyId) {
    res.status(400).json({ error: "Empresa não selecionada" });
    return null;
  }
  return companyId;
}

async function ensureTaskInCompany(taskId: string, companyId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { companyId } },
    include: {
      project: {
        include: {
          members: { select: { userId: true } },
        },
      },
      assignee: { select: { id: true } },
    },
  });

  if (!task) {
    throw Object.assign(new Error("Task not found"), { statusCode: 404 });
  }

  return task;
}

async function ensureCommentInCompany(commentId: string, companyId: string) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, task: { project: { companyId } } },
    include: {
      task: {
        include: {
          project: {
            include: {
              owner: { select: { id: true } },
              members: { select: { userId: true, role: true } },
            },
          },
        },
      },
    },
  });

  if (!comment) {
    throw Object.assign(new Error("Comment not found"), { statusCode: 404 });
  }

  return comment;
}

/**
 * Lista comentários de uma tarefa
 */
export async function getTaskComments(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { taskId } = req.params;

    try {
      await ensureTaskInCompany(taskId, companyId);
    } catch (err) {
      if ((err as any).statusCode) {
        return res.status((err as any).statusCode).json({ error: (err as Error).message });
      }
      throw err;
    }

    const comments = await prisma.comment.findMany({
      where: {
        taskId,
        parentId: null,
        task: { project: { companyId } },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: {
          where: {
            task: { project: { companyId } },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(comments);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Cria um novo comentário
 */
export async function createComment(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { taskId } = req.params;
    const parse = CreateCommentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    let task;
    try {
      task = await ensureTaskInCompany(taskId, companyId);
    } catch (err) {
      if ((err as any).statusCode) {
        return res.status((err as any).statusCode).json({ error: (err as Error).message });
      }
      throw err;
    }

    if (parse.data.parentId) {
      const parentComment = await prisma.comment.findFirst({
        where: { id: parse.data.parentId, task: { project: { companyId } } },
        select: { id: true },
      });
      if (!parentComment) {
        return res.status(404).json({ error: "Comentário pai não encontrado" });
      }
    }

    const membership = await prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
      select: { userId: true },
    });

    if (!membership) {
      return res.status(403).json({ error: "Usuário não pertence à empresa" });
    }

    const comment = await prisma.comment.create({
      data: {
        taskId,
        userId,
        content: parse.data.content,
        parentId: parse.data.parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const userIdsToNotify = task.project.members
      .map((m) => m.userId)
      .filter((id) => id !== userId);

    if (task.assigneeId && task.assigneeId !== userId && !userIdsToNotify.includes(task.assigneeId)) {
      userIdsToNotify.push(task.assigneeId);
    }

    if (userIdsToNotify.length > 0) {
      const commenter = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      createNotificationsForUsers(userIdsToNotify, companyId, {
        type: "comment",
        title: "Novo comentário",
        message: `${commenter?.name || "Alguém"} comentou na tarefa "${task.title}"`,
        entityType: "Task",
        entityId: taskId,
        link: `/projects/${task.projectId}/tasks`,
      }).catch(console.error);
    }

    logCreate(userId, companyId, "Comment", comment.id, {
      content: comment.content,
      taskId: comment.taskId,
    }).catch(console.error);

    triggerWebhooks(WEBHOOK_EVENTS.COMMENT_CREATED, comment, task.projectId).catch(console.error);

    res.status(201).json(comment);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Atualiza um comentário
 */
export async function updateComment(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const parse = UpdateCommentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    let oldComment;
    try {
      oldComment = await ensureCommentInCompany(req.params.id, companyId);
    } catch (err) {
      if ((err as any).statusCode) {
        return res.status((err as any).statusCode).json({ error: (err as Error).message });
      }
      throw err;
    }

    if (oldComment.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const comment = await prisma.comment.update({
      where: { id: req.params.id },
      data: {
        content: parse.data.content,
        editedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logUpdate(userId, companyId, "Comment", comment.id, oldComment, comment).catch(console.error);

    triggerWebhooks(WEBHOOK_EVENTS.COMMENT_UPDATED, comment, oldComment.task.projectId).catch(console.error);

    res.json(comment);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Deleta um comentário
 */
export async function deleteComment(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    let comment;
    try {
      comment = await ensureCommentInCompany(req.params.id, companyId);
    } catch (err) {
      if ((err as any).statusCode) {
        return res.status((err as any).statusCode).json({ error: (err as Error).message });
      }
      throw err;
    }

    const userMembership = await prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
      select: { role: true },
    });

    const isOwner = comment.userId === userId;
    const isProjectOwner = comment.task.project.ownerId === userId;
    const isProjectManager = comment.task.project.members.some(
      (m) => m.userId === userId && m.role === "PROJECT_MANAGER"
    );
    const isCompanyAdmin = userMembership?.role === "OWNER" || userMembership?.role === "ADMIN";

    if (!isOwner && !isProjectOwner && !isProjectManager && !isCompanyAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.comment.delete({
      where: { id: comment.id },
    });

    logDelete(userId, companyId, "Comment", comment.id, {
      content: comment.content,
      taskId: comment.taskId,
    }).catch(console.error);

    triggerWebhooks(WEBHOOK_EVENTS.COMMENT_DELETED, comment, comment.task.projectId).catch(console.error);

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

