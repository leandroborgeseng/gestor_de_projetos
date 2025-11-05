import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { handleError } from "../../utils/errors.js";

export async function getColumns(req: Request, res: Response) {
  try {
    const { projectId } = req.params;

    const columns = await prisma.kanbanColumn.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    res.json(columns);
  } catch (error) {
    handleError(error, res);
  }
}

export async function createColumn(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { title, status, order } = req.body;

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
    handleError(error, res);
  }
}

export async function updateColumn(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, status, order } = req.body;

    const column = await prisma.kanbanColumn.update({
      where: { id },
      data: { title, status, order },
    });

    res.json(column);
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteColumn(req: Request, res: Response) {
  try {
    await prisma.kanbanColumn.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

