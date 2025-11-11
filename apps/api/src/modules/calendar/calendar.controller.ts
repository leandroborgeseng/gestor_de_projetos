import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { handleError } from "../../utils/errors.js";
import { createEvents, EventAttributes } from "ics";

function getCompanyOrReject(req: Request, res: Response): string | null {
  const companyId = req.companyId;
  if (!companyId) {
    res.status(400).json({ error: "Empresa não selecionada" });
    return null;
  }
  return companyId;
}

async function ensureProjectInCompany(projectId: string, companyId: string) {
  const project = (await prisma.project.findUnique({
    where: { id: projectId },
  })) as { id: string; name: string; companyId: string } | null;

  if (!project || project.companyId !== companyId) {
    throw Object.assign(new Error("Projeto não encontrado"), { statusCode: 404 });
  }

  return { id: project.id, name: project.name };
}

async function ensureMembership(companyId: string, userId: string) {
  const membership = await (prisma as any).companyUser.findUnique({
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

/**
 * Exporta tarefas de um projeto para formato iCal
 */
export async function exportTasksToICal(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { projectId } = req.params;
    const { assigneeId, sprintId } = req.query as { assigneeId?: string; sprintId?: string };

    await ensureProjectInCompany(projectId, companyId);

    const where: Prisma.TaskWhereInput = {
      projectId,
    };

    if (assigneeId) {
      const membership = await ensureMembership(companyId, assigneeId);
      if (membership) {
        where.assigneeId = assigneeId;
      }
    }

    if (sprintId) {
      where.sprintId = sprintId;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
        sprint: {
          select: { id: true, name: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const events: EventAttributes[] = tasks
      .filter((task) => task.dueDate || task.startDate)
      .map((task) => {
        const startDate = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!);
        const endDate = task.dueDate
          ? new Date(task.dueDate)
          : new Date(startDate.getTime() + 60 * 60 * 1000);

        const formatDate = (date: Date): [number, number, number, number, number] => {
          return [
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            date.getHours() || 9,
            date.getMinutes() || 0,
          ];
        };

        const description = [
          task.description || "",
          task.assignee ? `Responsável: ${task.assignee.name}` : "",
          task.sprint ? `Sprint: ${task.sprint.name}` : "",
          `Status: ${task.status}`,
        ]
          .filter(Boolean)
          .join("\n");

        return {
          title: task.title,
          description,
          start: formatDate(startDate),
          end: formatDate(endDate),
          location: task.project.name,
          url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/projects/${projectId}/tasks`,
          status: task.status === "DONE" ? "CONFIRMED" : "TENTATIVE",
          busyStatus: "BUSY",
          organizer: task.assignee
            ? { name: task.assignee.name, email: task.assignee.email || "" }
            : undefined,
        } as EventAttributes;
      });

    const { error, value } = createEvents(events);

    if (error) {
      return res.status(500).json({ error: "Erro ao gerar arquivo iCal", details: error });
    }

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="tasks-${projectId}.ics"`);
    res.send(value);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Exporta sprints de um projeto para formato iCal
 */
export async function exportSprintsToICal(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { projectId } = req.params;

    const project = await ensureProjectInCompany(projectId, companyId);

    const sprints = (await prisma.sprint.findMany({
      where: {
        projectId,
      },
      include: {
        tasks: {
          select: { id: true, title: true, status: true },
        },
      },
    })) as Array<
      {
        id: string;
        name: string;
        goal: string | null;
        startDate: Date;
        endDate: Date;
        tasks: Array<{ id: string; title: string; status: string }>;
      }
    >;

    const events: EventAttributes[] = sprints.map((sprint) => {
      const formatDate = (date: Date): [number, number, number, number, number] => {
        return [
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate(),
          date.getHours(),
          date.getMinutes(),
        ];
      };

      const sprintTasks = (sprint as any).tasks as Array<{ id: string; title: string; status: string }>;
      const completedTasks = sprintTasks.filter((t) => t.status === "DONE").length;
      const totalTasks = sprintTasks.length;
      const description = [
        sprint.goal || "",
        `Tarefas: ${completedTasks}/${totalTasks} concluídas`,
        sprintTasks.length > 0 ? `Tarefas: ${sprintTasks.map((t) => t.title).join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        title: sprint.name,
        description,
        start: formatDate(sprint.startDate),
        end: formatDate(sprint.endDate),
        location: project.name,
        url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/projects/${projectId}/sprints`,
        status: "CONFIRMED",
        busyStatus: "BUSY",
      } as EventAttributes;
    });

    const { error, value } = createEvents(events);

    if (error) {
      return res.status(500).json({ error: "Erro ao gerar arquivo iCal", details: error });
    }

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="sprints-${projectId}.ics"`);
    res.send(value);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Busca tarefas e sprints para visualização em calendário
 */
export async function getCalendarData(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { projectId } = req.params;
    const { startDate, endDate, assigneeId } = req.query as {
      startDate?: string;
      endDate?: string;
      assigneeId?: string;
    };

    await ensureProjectInCompany(projectId, companyId);

    const where: Prisma.TaskWhereInput = {
      projectId,
    };

    if (assigneeId) {
      const membership = await ensureMembership(companyId, assigneeId);
      if (membership) {
        where.assigneeId = assigneeId;
      }
    }

    if (startDate || endDate) {
      where.OR = [];
      if (startDate) {
        const start = new Date(startDate);
        where.OR.push({ startDate: { gte: start } });
        where.OR.push({ dueDate: { gte: start } });
      }
      if (endDate) {
        const end = new Date(endDate);
        where.OR.push({ startDate: { lte: end } });
        where.OR.push({ dueDate: { lte: end } });
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        sprint: {
          select: { id: true, name: true },
        },
      },
    });

    const sprints = (await prisma.sprint.findMany({
      where: {
        projectId,
        ...(startDate && endDate
          ? {
              OR: [
                {
                  startDate: { lte: new Date(endDate) },
                  endDate: { gte: new Date(startDate) },
                },
              ],
            }
          : {}),
      },
      include: {
        tasks: {
          select: { id: true, title: true, status: true },
        },
      },
    })) as Array<
      {
        id: string;
        name: string;
        goal: string | null;
        startDate: Date;
        endDate: Date;
        tasks: Array<{ id: string; title: string; status: string }>;
      }
    >;

    res.json({
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        startDate: task.startDate,
        dueDate: task.dueDate,
        status: task.status,
        assignee: task.assignee,
        sprint: task.sprint,
        projectId: task.projectId,
      })),
      sprints: sprints.map((sprint) => {
        const sprintTasks = (sprint as any).tasks as Array<{ id: string; title: string; status: string }>;
        return {
        id: sprint.id,
        name: sprint.name,
        goal: sprint.goal,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        taskCount: sprintTasks.length,
        completedTaskCount: sprintTasks.filter((t) => t.status === "DONE").length,
      };
      }),
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Parse básico de arquivo iCal
 */
function parseICal(icalContent: string): Array<{
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
}> {
  const events: Array<{
    title: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
  }> = [];

  const eventMatches = icalContent.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

  eventMatches.forEach((eventBlock) => {
    let title = "";
    let description = "";
    let startStr = "";
    let endStr = "";
    let location = "";

    const lines = eventBlock.split(/\r?\n/);
    lines.forEach((line) => {
      if (line.startsWith("SUMMARY:")) {
        title = line.substring(8).trim();
      } else if (line.startsWith("DESCRIPTION:")) {
        description = line.substring(12).trim();
      } else if (line.startsWith("DTSTART")) {
        const match = line.match(/DTSTART[^:]*:(.+)/);
        if (match) startStr = match[1].trim();
      } else if (line.startsWith("DTEND")) {
        const match = line.match(/DTEND[^:]*:(.+)/);
        if (match) endStr = match[1].trim();
      } else if (line.startsWith("LOCATION:")) {
        location = line.substring(9).trim();
      }
    });

    if (title && startStr) {
      const parseICalDate = (dateStr: string): Date => {
        if (dateStr.length === 8) {
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1;
          const day = parseInt(dateStr.substring(6, 8));
          return new Date(year, month, day);
        } else if (dateStr.length >= 15) {
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1;
          const day = parseInt(dateStr.substring(6, 8));
          const hour = dateStr.length > 9 ? parseInt(dateStr.substring(9, 11)) : 0;
          const minute = dateStr.length > 11 ? parseInt(dateStr.substring(11, 13)) : 0;
          const second = dateStr.length > 13 ? parseInt(dateStr.substring(13, 15)) : 0;
          return new Date(year, month, day, hour, minute, second);
        }
        return new Date();
      };

      const start = parseICalDate(startStr);
      const end = endStr ? parseICalDate(endStr) : new Date(start.getTime() + 60 * 60 * 1000);

      events.push({
        title,
        description: description || undefined,
        start,
        end,
        location: location || undefined,
      });
    }
  });

  return events;
}

/**
 * Importa tarefas de um arquivo iCal
 */
export async function importTasksFromICal(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { projectId } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    await ensureMembership(companyId, userId);
    await ensureProjectInCompany(projectId, companyId);

    if (!req.body || !req.body.content) {
      return res.status(400).json({ error: "Conteúdo do arquivo iCal é obrigatório" });
    }

    const icalContent = req.body.content;
    const events = parseICal(icalContent);

    if (events.length === 0) {
      return res.status(400).json({ error: "Nenhum evento encontrado no arquivo iCal" });
    }

    const createdTasks = [];
    for (const event of events) {
      try {
        const task = await prisma.task.create({
          data: {
            title: event.title,
            description: event.description || null,
            status: "TODO",
            projectId,
            startDate: event.start,
            dueDate: event.end,
            assigneeId: userId,
          },
        });
        createdTasks.push(task);
      } catch (error) {
        console.error(`Erro ao criar tarefa ${event.title}:`, error);
      }
    }

    res.json({
      message: `${createdTasks.length} tarefa(s) importada(s) com sucesso`,
      tasks: createdTasks,
      total: events.length,
      imported: createdTasks.length,
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

