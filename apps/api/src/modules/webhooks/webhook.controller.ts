import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateWebhookSchema, UpdateWebhookSchema } from "./webhook.model.js";
import { handleError } from "../../utils/errors.js";

function getCompanyOrReject(req: Request, res: Response): string | null {
  const companyId = req.companyId;
  if (!companyId) {
    res.status(400).json({ error: "Empresa não selecionada" });
    return null;
  }
  return companyId;
}

async function ensureMembership(companyId: string, userId: string) {
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

function canManageWebhooks(role?: string) {
  return role === "OWNER" || role === "ADMIN";
}

async function ensureWebhookInCompany(id: string, companyId: string) {
  const webhook = await prisma.webhook.findFirst({
    where: { id, companyId },
    include: {
      project: {
        select: { id: true, name: true },
      },
      logs: {
        take: 50,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!webhook) {
    throw Object.assign(new Error("Webhook não encontrado"), { statusCode: 404 });
  }

  return webhook;
}

async function ensureProject(companyId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true, name: true },
  });

  if (!project) {
    throw Object.assign(new Error("Projeto não encontrado"), { statusCode: 404 });
  }

  return project;
}

/**
 * Lista todos os webhooks do usuário
 */
export async function getWebhooks(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    await ensureMembership(companyId, userId);

    const { projectId } = req.query as { projectId?: string };

    if (projectId) {
      await ensureProject(companyId, projectId);
    }

    const webhooks = await prisma.webhook.findMany({
      where: {
        companyId,
        ...(projectId ? { projectId } : {}),
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(webhooks);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Busca um webhook específico
 */
export async function getWebhook(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const webhook = await ensureWebhookInCompany(req.params.id, companyId);

    res.json(webhook);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Cria um novo webhook
 */
export async function createWebhook(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const membership = await ensureMembership(companyId, userId);
    if (!canManageWebhooks(membership.role)) {
      return res.status(403).json({ error: "Você não tem permissão para criar webhooks" });
    }

    const parse = CreateWebhookSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const data = parse.data;

    if (data.projectId) {
      await ensureProject(companyId, data.projectId);
    }

    const webhook = await prisma.webhook.create({
      data: {
        companyId,
        projectId: data.projectId || null,
        url: data.url,
        events: data.events,
        secret: data.secret || null,
        description: data.description || null,
        active: data.active ?? true,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json(webhook);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Atualiza um webhook
 */
export async function updateWebhook(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const membership = await ensureMembership(companyId, userId);
    if (!canManageWebhooks(membership.role)) {
      return res.status(403).json({ error: "Você não tem permissão para atualizar webhooks" });
    }

    const parse = UpdateWebhookSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const existing = await ensureWebhookInCompany(req.params.id, companyId);

    if (parse.data.projectId) {
      await ensureProject(companyId, parse.data.projectId);
    }

    const updated = await prisma.webhook.update({
      where: { id: existing.id },
      data: {
        url: parse.data.url ?? existing.url,
        events: parse.data.events ?? existing.events,
        secret: parse.data.secret ?? existing.secret,
        description: parse.data.description ?? existing.description,
        active: parse.data.active ?? existing.active,
        projectId:
          parse.data.projectId !== undefined
            ? parse.data.projectId
            : existing.projectId,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
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

/**
 * Deleta um webhook
 */
export async function deleteWebhook(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const membership = await ensureMembership(companyId, userId);
    if (!canManageWebhooks(membership.role)) {
      return res.status(403).json({ error: "Você não tem permissão para deletar webhooks" });
    }

    const webhook = await ensureWebhookInCompany(req.params.id, companyId);

    await prisma.webhook.delete({
      where: { id: webhook.id },
    });

    res.json({ message: "Webhook deletado com sucesso" });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Lista logs de um webhook
 */
export async function getWebhookLogs(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const membership = await ensureMembership(companyId, userId);
    if (!canManageWebhooks(membership.role)) {
      return res.status(403).json({ error: "Você não tem permissão para visualizar logs" });
    }

    const { id } = req.params;
    const { limit = "50", offset = "0" } = req.query as { limit?: string; offset?: string };

    const webhook = await ensureWebhookInCompany(id, companyId);

    const logs = await prisma.webhookLog.findMany({
      where: { webhookId: webhook.id },
      take: parseInt(limit) || 50,
      skip: parseInt(offset) || 0,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.webhookLog.count({
      where: { webhookId: webhook.id },
    });

    res.json({
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      },
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

