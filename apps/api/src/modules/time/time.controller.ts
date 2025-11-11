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

const UpdateTimeEntrySchema = z.object({
  hours: z.number().positive().optional(),
  date: z.string().datetime().optional(),
  notes: z.string().nullable().optional(),
});

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
    throw Object.assign(new Error("Task not found"), { statusCode: 404 });
  }

  return task;
}

async function ensureTimeEntryInCompany(timeEntryId: string, companyId: string) {
  const entry = await prisma.timeEntry.findFirst({
    where: { id: timeEntryId, task: { project: { companyId } } },
    include: {
      task: {
        select: {
          id: true,
          projectId: true,
          project: {
            select: { companyId: true },
          },
        },
      },
    },
  });

  if (!entry) {
    throw Object.assign(new Error("Time entry not found"), { statusCode: 404 });
  }

  return entry;
}

async function getMembership(companyId: string, userId: string) {
  return prisma.companyUser.findUnique({
    where: {
      companyId_userId: {
        companyId,
        userId,
      },
    },
  });
}

function canManageTimeEntry(membershipRole?: string) {
  return membershipRole === "OWNER" || membershipRole === "ADMIN";
}

export async function getTimeEntries(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { taskId, userId } = req.query as { taskId?: string; userId?: string };

    const where: any = {
      task: {
        project: {
          companyId,
        },
      },
    };
    if (taskId) {
      await ensureTaskInCompany(taskId, companyId);
      where.taskId = taskId;
    }
    if (userId) {
      const membership = await getMembership(companyId, userId);
      if (!membership) {
        return res.status(404).json({ error: "Usuário não pertence à empresa" });
      }
      where.userId = userId;
    }

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
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const parse = CreateTimeEntrySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const membership = await getMembership(companyId, userId);
    if (!membership) {
      return res.status(403).json({ error: "Usuário não pertence à empresa" });
    }

    const { taskId, hours, date, notes } = parse.data;
    await ensureTaskInCompany(taskId, companyId);

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

    const totalHours = await prisma.timeEntry.aggregate({
      where: { taskId, task: { project: { companyId } } },
      _sum: { hours: true },
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { actualHours: totalHours._sum.hours || 0 },
    });

    res.status(201).json(entry);
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateTimeEntry(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const parse = UpdateTimeEntrySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const entry = await ensureTimeEntryInCompany(req.params.id, companyId);

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const membership = await getMembership(companyId, userId);
    const isOwner = entry.userId === userId;
    const canManage = canManageTimeEntry(membership?.role);

    if (!isOwner && !canManage) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { hours, date, notes } = parse.data;
    const data: any = {};

    if (hours !== undefined) data.hours = hours;
    if (date !== undefined) data.date = new Date(date);
    if (notes !== undefined) data.notes = notes;

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: req.params.id },
      data,
      include: {
        task: {
          select: { id: true, title: true, projectId: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const totalHours = await prisma.timeEntry.aggregate({
      where: { taskId: updatedEntry.taskId, task: { project: { companyId } } },
      _sum: { hours: true },
    });

    await prisma.task.update({
      where: { id: updatedEntry.taskId },
      data: { actualHours: totalHours._sum.hours || 0 },
    });

    res.json(updatedEntry);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function deleteTimeEntry(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const entry = await ensureTimeEntryInCompany(req.params.id, companyId);

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const membership = await getMembership(companyId, userId);
    const isOwner = entry.userId === userId;
    const canManage = canManageTimeEntry(membership?.role);

    if (!isOwner && !canManage) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.timeEntry.delete({ where: { id: req.params.id } });

    const totalHours = await prisma.timeEntry.aggregate({
      where: { taskId: entry.taskId, task: { project: { companyId } } },
      _sum: { hours: true },
    });

    await prisma.task.update({
      where: { id: entry.taskId },
      data: { actualHours: totalHours._sum.hours || 0 },
    });

    res.status(204).send();
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

// Relatório de horas por projeto
export async function getHoursByProject(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { projectId, startDate, endDate } = req.query as {
      projectId?: string;
      startDate?: string;
      endDate?: string;
    };

    const where: any = {
      task: {
        project: {
          companyId,
        },
      },
    };

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, companyId },
        select: { id: true },
      });
      if (!project) {
        return res.status(404).json({ error: "Projeto não encontrado" });
      }
      where.task.projectId = projectId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        task: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const projectMap = new Map<string, {
      projectId: string;
      projectName: string;
      totalHours: number;
      entries: any[];
      byUser: Map<string, { userId: string; userName: string; totalHours: number; entries: any[] }>;
    }>();

    for (const entry of entries) {
      const pId = entry.task.project.id;
      const projectName = entry.task.project.name;

      if (!projectMap.has(pId)) {
        projectMap.set(pId, {
          projectId: pId,
          projectName,
          totalHours: 0,
          entries: [],
          byUser: new Map(),
        });
      }

      const project = projectMap.get(pId)!;
      project.totalHours += Number(entry.hours);
      project.entries.push(entry);

      const userId = entry.user.id;
      const userName = entry.user.name;

      if (!project.byUser.has(userId)) {
        project.byUser.set(userId, {
          userId,
          userName,
          totalHours: 0,
          entries: [],
        });
      }

      const user = project.byUser.get(userId)!;
      user.totalHours += Number(entry.hours);
      user.entries.push(entry);
    }

    const result = Array.from(projectMap.values()).map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      totalHours: Number(project.totalHours.toFixed(2)),
      byUser: Array.from(project.byUser.values()).map((user) => ({
        userId: user.userId,
        userName: user.userName,
        totalHours: Number(user.totalHours.toFixed(2)),
        entriesCount: user.entries.length,
        entries: user.entries.map((entry) => ({
          id: entry.id,
          hours: Number(entry.hours),
          date: entry.date,
          notes: entry.notes,
          task: {
            id: entry.task.id,
            title: entry.task.title,
          },
        })),
      })),
      entriesCount: project.entries.length,
    }));

    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
}

// Relatório de horas por pessoa
export async function getHoursByPerson(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { userId, startDate, endDate } = req.query as {
      userId?: string;
      startDate?: string;
      endDate?: string;
    };

    const where: any = {
      task: {
        project: {
          companyId,
        },
      },
    };

    if (userId) {
      const membership = await getMembership(companyId, userId);
      if (!membership) {
        return res.status(404).json({ error: "Usuário não pertence à empresa" });
      }
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        task: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const userMap = new Map<string, {
      userId: string;
      userName: string;
      userEmail: string;
      totalHours: number;
      entries: any[];
      byProject: Map<string, { projectId: string; projectName: string; totalHours: number; entries: any[] }>;
    }>();

    for (const entry of entries) {
      const uId = entry.user.id;
      const userName = entry.user.name;
      const userEmail = entry.user.email;

      if (!userMap.has(uId)) {
        userMap.set(uId, {
          userId: uId,
          userName,
          userEmail,
          totalHours: 0,
          entries: [],
          byProject: new Map(),
        });
      }

      const user = userMap.get(uId)!;
      user.totalHours += Number(entry.hours);
      user.entries.push(entry);

      const projectId = entry.task.project.id;
      const projectName = entry.task.project.name;

      if (!user.byProject.has(projectId)) {
        user.byProject.set(projectId, {
          projectId,
          projectName,
          totalHours: 0,
          entries: [],
        });
      }

      const project = user.byProject.get(projectId)!;
      project.totalHours += Number(entry.hours);
      project.entries.push(entry);
    }

    const result = Array.from(userMap.values()).map((user) => ({
      userId: user.userId,
      userName: user.userName,
      userEmail: user.userEmail,
      totalHours: Number(user.totalHours.toFixed(2)),
      byProject: Array.from(user.byProject.values()).map((project) => ({
        projectId: project.projectId,
        projectName: project.projectName,
        totalHours: Number(project.totalHours.toFixed(2)),
        entriesCount: project.entries.length,
        entries: project.entries.map((entry) => ({
          id: entry.id,
          hours: Number(entry.hours),
          date: entry.date,
          notes: entry.notes,
          task: {
            id: entry.task.id,
            title: entry.task.title,
          },
        })),
      })),
      entriesCount: user.entries.length,
    }));

    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
}

