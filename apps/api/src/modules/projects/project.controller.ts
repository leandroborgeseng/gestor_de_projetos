import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateProjectSchema, UpdateProjectSchema } from "./project.model.js";
import { handleError } from "../../utils/errors.js";
import { getPaginationParams } from "../../utils/pagination.js";

function effectiveRate(t: any): number {
  if (t.hourlyRateOverride) return Number(t.hourlyRateOverride);
  if (t.assignee?.hourlyRate) return Number(t.assignee.hourlyRate);
  if (t.project?.defaultHourlyRate) return Number(t.project.defaultHourlyRate);
  return 0;
}

function taskCost(t: any): number {
  if (t.costOverride) return Number(t.costOverride);
  const hours = t.actualHours && t.actualHours > 0 ? Number(t.actualHours) : Number(t.estimateHours ?? 0);
  return hours * effectiveRate(t);
}

export async function getProjects(req: Request, res: Response) {
  try {
    const { skip, take, page, limit } = getPaginationParams(req.query);
    const { q, archived } = req.query as { q?: string; archived?: string };

    const where: any = {};
    
    // Filtrar por busca
    if (q) {
      where.name = { contains: q, mode: "insensitive" as const };
    }

    // Filtrar por arquivado (por padrão, mostrar apenas não arquivados)
    // Se archived=true, mostrar apenas arquivados
    // Se archived=false ou não especificado, mostrar apenas não arquivados
    if (archived === "true") {
      where.archived = true;
    } else {
      where.archived = false;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take,
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getProjectsSummary(req: Request, res: Response) {
  try {
    const { q, assigneeId } = req.query as { q?: string; assigneeId?: string };

    // Construir filtros
    const projectWhere: any = {
      archived: false, // Por padrão, apenas projetos não arquivados
    };
    if (q) {
      projectWhere.OR = [
        { name: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ];
    }

    const projects = await prisma.project.findMany({
      where: projectWhere,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, hourlyRate: true },
            },
            project: {
              select: { id: true, name: true, defaultHourlyRate: true },
            },
          },
          ...(assigneeId ? { where: { assigneeId } } : {}),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const summaries = projects.map((project) => {
      // Filtrar tarefas se necessário
      let tasks = project.tasks;
      
      // Se tiver busca, filtrar tarefas também
      if (q) {
        tasks = tasks.filter((task: any) => 
          task.title.toLowerCase().includes(q.toLowerCase()) ||
          task.description?.toLowerCase().includes(q.toLowerCase())
        );
      }

      // Contar tarefas por status
      const tasksByStatus = tasks.reduce((acc: any, task: any) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});

      // Calcular percentual de conclusão (tarefas DONE / total)
      const completedTasks = tasksByStatus.DONE || 0;
      const completionPercentage = tasks.length > 0 
        ? Math.round((completedTasks / tasks.length) * 100) 
        : 0;

      // Calcular custos e horas
      let totalPlanned = 0;
      let totalActual = 0;
      let totalPlannedHours = 0;
      let totalActualHours = 0;

      tasks.forEach((task: any) => {
        const planned = Number(task.estimateHours) * effectiveRate(task);
        const actual = taskCost(task);
        totalPlanned += planned;
        totalActual += actual;
        
        // Calcular horas
        const plannedHours = Number(task.estimateHours) || 0;
        const actualHours = Number(task.actualHours) || 0;
        totalPlannedHours += plannedHours;
        totalActualHours += actualHours;
      });

      // Encontrar datas mínimas e máximas
      const taskDates = tasks
        .filter((t: any) => t.startDate || t.dueDate)
        .map((t: any) => [t.startDate, t.dueDate].filter(Boolean))
        .flat()
        .map((d: any) => new Date(d).getTime());

      const startDate = taskDates.length > 0 ? new Date(Math.min(...taskDates)) : null;
      const endDate = taskDates.length > 0 ? new Date(Math.max(...taskDates)) : null;

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        owner: project.owner,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        totalTasks: tasks.length,
        tasksByStatus,
        completionPercentage,
        totalPlanned: Number(totalPlanned.toFixed(2)),
        totalActual: Number(totalActual.toFixed(2)),
        totalPlannedHours: Number(totalPlannedHours.toFixed(2)),
        totalActualHours: Number(totalActualHours.toFixed(2)),
        startDate,
        endDate,
      };
    });

    // Filtrar projetos que não têm tarefas após busca em tarefas
    const filteredSummaries = summaries.filter((summary) => {
      if (q && summary.totalTasks === 0) {
        // Se busca está ativa e não tem tarefas, ainda mostrar se o projeto corresponde à busca
        return true;
      }
      return true;
    });

    res.json(filteredSummaries);
  } catch (error) {
    handleError(error, res);
  }
}

export async function searchAll(req: Request, res: Response) {
  try {
    const { q, assigneeId, type } = req.query as { 
      q?: string; 
      assigneeId?: string;
      type?: "projects" | "tasks" | "all";
    };

    const searchType = type || "all";
    const results: any = {
      projects: [],
      tasks: [],
    };

    if (searchType === "projects" || searchType === "all") {
      const projectWhere: any = {
        archived: false, // Apenas projetos não arquivados na busca geral
      };
      if (q) {
        projectWhere.OR = [
          { name: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
        ];
      }

      const projects = await prisma.project.findMany({
        where: projectWhere,
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
        take: 10,
      });

      results.projects = projects;
    }

    if (searchType === "tasks" || searchType === "all") {
      const taskWhere: any = {};
      
      if (q) {
        taskWhere.OR = [
          { title: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
        ];
      }

      if (assigneeId) {
        taskWhere.assigneeId = assigneeId;
      }

      const tasks = await prisma.task.findMany({
        where: taskWhere,
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
        take: 20,
        orderBy: { createdAt: "desc" },
      });

      results.tasks = tasks;
    }

    res.json(results);
  } catch (error) {
    handleError(error, res);
  }
}

// Buscar tarefas por status em todos os projetos
export async function getTasksByStatus(req: Request, res: Response) {
  try {
    const { status, assigneeId } = req.query as { status?: string; assigneeId?: string };

    if (!status) {
      return res.status(400).json({ error: "Status é obrigatório" });
    }

    const where: any = {
      status: status as any,
      parentId: null, // Apenas tarefas principais
    };

    // Filtrar por assignee se fornecido
    if (assigneeId) {
      where.assigneeId = assigneeId;
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
      orderBy: [
        { project: { name: "asc" } },
        { createdAt: "desc" },
      ],
    });

    res.json(tasks);
  } catch (error) {
    handleError(error, res);
  }
}

export async function createProject(req: Request, res: Response) {
  try {
    const parse = CreateProjectSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const project = await prisma.project.create({
      data: {
        ...parse.data,
        ownerId: userId,
        columns: {
          create: [
            { title: "Backlog", status: "BACKLOG", order: 0 },
            { title: "To Do", status: "TODO", order: 1 },
            { title: "In Progress", status: "IN_PROGRESS", order: 2 },
            { title: "Review", status: "REVIEW", order: 3 },
            { title: "Done", status: "DONE", order: 4 },
          ],
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json(project);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getProject(req: Request, res: Response) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        columns: {
          orderBy: { order: "asc" },
        },
        sprints: {
          orderBy: { startDate: "asc" },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateProject(req: Request, res: Response) {
  try {
    const parse = UpdateProjectSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: parse.data,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(project);
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteProject(req: Request, res: Response) {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

// Arquivar projeto
export async function archiveProject(req: Request, res: Response) {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { archived: true },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(project);
  } catch (error) {
    handleError(error, res);
  }
}

// Desarquivar projeto
export async function unarchiveProject(req: Request, res: Response) {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { archived: false },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(project);
  } catch (error) {
    handleError(error, res);
  }
}
