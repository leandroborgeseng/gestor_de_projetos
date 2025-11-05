import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { handleError } from "../../utils/errors.js";

const CreateTimeEntrySchema = z.object({
  taskId: z.string().cuid(),
  hours: z.number().positive(),
  date: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function getTimeEntries(req: Request, res: Response) {
  try {
    const { taskId, userId } = req.query as { taskId?: string; userId?: string };

    const where: any = {};
    if (taskId) where.taskId = taskId;
    if (userId) where.userId = userId;

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        task: {
          select: { id: true, title: true, projectId: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { date: "desc" },
    });

    res.json(entries);
  } catch (error) {
    handleError(error, res);
  }
}

export async function createTimeEntry(req: Request, res: Response) {
  try {
    const parse = CreateTimeEntrySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { taskId, hours, date, notes } = parse.data;

    const entry = await prisma.timeEntry.create({
      data: {
        taskId,
        userId,
        hours,
        date: date ? new Date(date) : new Date(),
        notes,
      },
      include: {
        task: {
          select: { id: true, title: true, projectId: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Update task actualHours
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (task) {
      const totalHours = await prisma.timeEntry.aggregate({
        where: { taskId },
        _sum: { hours: true },
      });

      await prisma.task.update({
        where: { id: taskId },
        data: { actualHours: totalHours._sum.hours || 0 },
      });
    }

    res.status(201).json(entry);
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteTimeEntry(req: Request, res: Response) {
  try {
    await prisma.timeEntry.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

