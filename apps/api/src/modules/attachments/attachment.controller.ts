import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { handleError } from "../../utils/errors.js";
import { getFileUrl, getFilePath, deleteFile as deleteFileFromDisk } from "../../config/upload.js";
import { logCreate, logDelete } from "../../services/activityLogger.js";
import fs from "fs";
import path from "path";

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
    select: { id: true, projectId: true },
  });

  if (!task) {
    throw Object.assign(new Error("Tarefa não encontrada"), { statusCode: 404 });
  }

  return task;
}

async function ensureAttachmentInCompany(attachmentId: string, companyId: string) {
  const attachment = await prisma.fileAttachment.findFirst({
    where: { id: attachmentId, task: { project: { companyId } } },
    select: { id: true, fileName: true, userId: true, taskId: true },
  });

  if (!attachment) {
    throw Object.assign(new Error("Anexo não encontrado"), { statusCode: 404 });
  }

  return attachment;
}

/**
 * Lista anexos de uma tarefa
 */
export async function getTaskAttachments(req: Request, res: Response) {
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

    const attachments = await prisma.fileAttachment.findMany({
      where: { taskId, task: { project: { companyId } } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(attachments);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Faz upload de um arquivo para uma tarefa
 */
export async function uploadAttachment(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { taskId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      if (req.file) deleteFileFromDisk(req.file.filename);
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    let task;
    try {
      task = await ensureTaskInCompany(taskId, companyId);
    } catch (err) {
      deleteFileFromDisk(req.file.filename);
      if ((err as any).statusCode) {
        return res.status((err as any).statusCode).json({ error: (err as Error).message });
      }
      throw err;
    }

    const fileUrl = getFileUrl(req.file.filename);

    const attachment = await prisma.fileAttachment.create({
      data: {
        taskId,
        userId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: fileUrl,
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

    logCreate(userId, companyId, "FileAttachment", attachment.id, {
      fileName: attachment.originalName,
      taskId: attachment.taskId,
      projectId: task.projectId,
    }).catch(console.error);

    res.status(201).json(attachment);
  } catch (error) {
    if (req.file) {
      deleteFileFromDisk(req.file.filename);
    }
    handleError(error, res);
  }
}

/**
 * Deleta um anexo
 */
export async function deleteAttachment(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let attachment;
    try {
      attachment = await ensureAttachmentInCompany(req.params.id, companyId);
    } catch (err) {
      if ((err as any).statusCode) {
        return res.status((err as any).statusCode).json({ error: (err as Error).message });
      }
      throw err;
    }

    const task = await prisma.task.findFirst({
      where: { id: attachment.taskId, project: { companyId } },
      include: {
        project: {
          include: {
            owner: { select: { id: true } },
            members: { select: { userId: true, role: true } },
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const user = await prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
      select: { role: true },
    });

    const isOwner = attachment.userId === userId;
    const isProjectOwner = task.project.ownerId === userId;
    const isProjectManager = task.project.members.some(
      (m) => m.userId === userId && m.role === "PROJECT_MANAGER"
    );
    const isCompanyAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

    if (!isOwner && !isProjectOwner && !isProjectManager && !isCompanyAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    deleteFileFromDisk(attachment.fileName);

    await prisma.fileAttachment.delete({
      where: { id: attachment.id },
    });

    logDelete(userId, companyId, "FileAttachment", attachment.id, {
      fileName: attachment.fileName,
      taskId: attachment.taskId,
      projectId: task.projectId,
    }).catch(console.error);

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Faz download de um anexo
 */
export async function downloadAttachment(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    let attachment;
    try {
      attachment = await ensureAttachmentInCompany(req.params.id, companyId);
    } catch (err) {
      if ((err as any).statusCode) {
        return res.status((err as any).statusCode).json({ error: (err as Error).message });
      }
      throw err;
    }

    const filePath = getFilePath(attachment.fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${attachment.originalName || attachment.fileName}"`);
    res.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    handleError(error, res);
  }
}

