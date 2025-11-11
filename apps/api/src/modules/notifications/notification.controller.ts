import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { handleError } from "../../utils/errors.js";
import { getPaginationParams } from "../../utils/pagination.js";

function getCompanyOrReject(req: Request, res: Response): string | null {
  const companyId = req.companyId;
  if (!companyId) {
    res.status(400).json({ error: "Empresa não selecionada" });
    return null;
  }
  return companyId;
}

async function ensureNotificationInCompany(notificationId: string, companyId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
      companyId,
    },
  });

  if (!notification) {
    throw Object.assign(new Error("Notification not found"), { statusCode: 404 });
  }

  return notification;
}

/**
 * Busca notificações do usuário logado
 */
export async function getNotifications(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const membership = await prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: "Usuário não pertence à empresa" });
    }

    const { skip, take, page, limit } = getPaginationParams(req.query);
    const { read, type } = req.query as { read?: string; type?: string };

    const where: any = { userId, companyId };
    if (read !== undefined) {
      where.read = read === "true";
    }
    if (type) {
      where.type = type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, companyId, read: false } }),
    ]);

    res.json({
      data: notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Marca uma notificação como lida
 */
export async function markAsRead(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const notification = await ensureNotificationInCompany(req.params.id, companyId, userId);

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { read: true },
    });

    res.json(updated);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Marca todas as notificações como lidas
 */
export async function markAllAsRead(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    await prisma.notification.updateMany({
      where: { userId, companyId, read: false },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Deleta uma notificação
 */
export async function deleteNotification(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    await ensureNotificationInCompany(req.params.id, companyId, userId);

    await prisma.notification.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Busca contagem de notificações não lidas
 */
export async function getUnreadCount(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const count = await prisma.notification.count({
      where: { userId, companyId, read: false },
    });

    res.json({ count });
  } catch (error) {
    handleError(error, res);
  }
}

