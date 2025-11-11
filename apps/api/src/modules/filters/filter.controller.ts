import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateFilterSchema, UpdateFilterSchema } from "./filter.model.js";
import { handleError } from "../../utils/errors.js";

/**
 * Lista todos os filtros do usuário
 */
export async function getFilters(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const companyId = req.companyId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const { type } = req.query as { type?: string };

    const where: any = { userId, companyId };
    if (type) {
      where.type = type;
    }

    const filters = await prisma.savedFilter.findMany({
      where,
      orderBy: [
        { isQuick: "desc" }, // Filtros rápidos primeiro
        { createdAt: "desc" },
      ],
    });

    res.json(filters);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Busca um filtro específico
 */
export async function getFilter(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const companyId = req.companyId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const filter = await prisma.savedFilter.findFirst({
      where: {
        id,
        userId, // Apenas filtros do próprio usuário
        companyId,
      },
    });

    if (!filter) {
      return res.status(404).json({ error: "Filtro não encontrado" });
    }

    res.json(filter);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Cria um novo filtro
 */
export async function createFilter(req: Request, res: Response) {
  try {
    const parse = CreateFilterSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const userId = req.user?.userId;
    const companyId = req.companyId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const data = parse.data;

    const filter = await prisma.savedFilter.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        filters: data.filters,
        isQuick: data.isQuick || false,
        userId,
        companyId,
      },
    });

    res.status(201).json(filter);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Atualiza um filtro
 */
export async function updateFilter(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const parse = UpdateFilterSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const userId = req.user?.userId;
    const companyId = req.companyId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const filter = await prisma.savedFilter.findFirst({
      where: {
        id,
        userId, // Apenas filtros do próprio usuário
        companyId,
      },
    });

    if (!filter) {
      return res.status(404).json({ error: "Filtro não encontrado" });
    }

    const updated = await prisma.savedFilter.update({
      where: { id },
      data: parse.data,
    });

    res.json(updated);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Deleta um filtro
 */
export async function deleteFilter(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const companyId = req.companyId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const filter = await prisma.savedFilter.findFirst({
      where: {
        id,
        userId, // Apenas filtros do próprio usuário
        companyId,
      },
    });

    if (!filter) {
      return res.status(404).json({ error: "Filtro não encontrado" });
    }

    await prisma.savedFilter.delete({
      where: { id },
    });

    res.json({ message: "Filtro deletado com sucesso" });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Lista filtros rápidos pré-definidos
 */
export async function getQuickFilters(req: Request, res: Response) {
  try {
    const { type } = req.query as { type?: string };
    const companyId = req.companyId;

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const where: any = { isQuick: true };
    where.companyId = companyId;
    if (type) {
      where.type = type;
    }

    const filters = await prisma.savedFilter.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    res.json(filters);
  } catch (error) {
    handleError(error, res);
  }
}

