import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { handleError } from "../../utils/errors.js";

function getCompanyOrReject(req: Request, res: Response): string | null {
  const companyId = req.companyId;
  if (!companyId) {
    res.status(400).json({ error: "Empresa não selecionada" });
    return null;
  }
  return companyId;
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
}

/**
 * Busca atividades do sistema
 * Query params:
 * - entityType: Filtrar por tipo de entidade (Task, Project, Sprint, etc.)
 * - entityId: Filtrar por ID de entidade específica
 * - userId: Filtrar por usuário
 * - action: Filtrar por ação (created, updated, deleted, etc.)
 * - startDate: Data inicial (ISO string)
 * - endDate: Data final (ISO string)
 * - limit: Limite de resultados (default: 50)
 * - offset: Offset para paginação
 */
export async function getActivities(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    await ensureMembership(companyId, req.user?.userId);

    const {
      entityType,
      entityId,
      userId,
      action,
      startDate,
      endDate,
      limit = "50",
      offset = "0",
    } = req.query as {
      entityType?: string;
      entityId?: string;
      userId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      limit?: string;
      offset?: string;
    };

    const where: any = {
      companyId,
    };

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (userId) {
      await ensureMembership(companyId, userId);
      where.userId = userId;
    }
    if (action) where.action = action;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
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
        take: parseInt(limit, 10),
        skip: parseInt(offset, 10),
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      data: activities,
      pagination: {
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        hasMore: parseInt(offset, 10) + activities.length < total,
      },
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Busca atividades de uma entidade específica
 */
export async function getEntityActivities(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    await ensureMembership(companyId, req.user?.userId);

    const { entityType, entityId } = req.params;
    const { limit = "50", offset = "0" } = req.query as {
      limit?: string;
      offset?: string;
    };

    const activities = await prisma.activityLog.findMany({
      where: {
        entityType,
        entityId,
        companyId,
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
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    });

    res.json(activities);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Busca uma atividade específica
 */
export async function getActivity(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    await ensureMembership(companyId, req.user?.userId);

    const activity = await prisma.activityLog.findFirst({
      where: { id: req.params.id, companyId },
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

    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    res.json(activity);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

