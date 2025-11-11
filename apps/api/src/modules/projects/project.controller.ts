import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateProjectSchema, UpdateProjectSchema } from "./project.model.js";
import { handleError } from "../../utils/errors.js";
import { getPaginationParams } from "../../utils/pagination.js";
import { logCreate, logUpdate, logDelete } from "../../services/activityLogger.js";
import { notifyProjectUpdated } from "../../services/notificationService.js";
import { triggerWebhooks } from "../../services/webhookService.js";
import { WEBHOOK_EVENTS } from "../webhooks/webhook.model.js";

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
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const { skip, take, page, limit } = getPaginationParams(req.query);
    const { q, archived } = req.query as { q?: string; archived?: string };

    const where: any = {};
    where.companyId = companyId;
    
    // Filtrar por busca
    if (q) {
      where.name = { contains: q, mode: "insensitive" as const };
    }

    // Filtrar por arquivado (por padrão, mostrar apenas não arquivados ou registros antigos sem flag)
    if (archived === "true") {
      where.archived = true;
    } else if (archived === "false") {
      where.archived = false;
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
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const { q, assigneeId } = req.query as { q?: string; assigneeId?: string };

    // Construir filtros
    const projectWhere: any = {
      companyId,
      archived: false,
    };
    if (q) {
      projectWhere.AND = projectWhere.AND || [];
      projectWhere.AND.push({
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
        ],
      });
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

    console.log(`[getProjectsSummary] Encontrados ${projects.length} projetos (filtro: archived=false, assigneeId=${assigneeId || 'nenhum'}, q=${q || 'nenhuma'})`);

    const summaries = projects.map((project) => {
      // Filtrar tarefas se necessário
      let tasks = project.tasks || [];
      
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
    // Quando assigneeId é usado, mostrar apenas projetos com tarefas atribuídas ao usuário
    const filteredSummaries = summaries.filter((summary) => {
      // Se há busca por texto, mostrar projetos mesmo sem tarefas (o projeto pode corresponder à busca)
      if (q && summary.totalTasks === 0) {
        return true;
      }
      // Se há filtro por assigneeId, mostrar apenas projetos com tarefas atribuídas
      if (assigneeId && summary.totalTasks === 0) {
        return false;
      }
      // Caso contrário, mostrar todos os projetos (mesmo sem tarefas)
      return true;
    });

    // Garantir que sempre retornamos um array
    res.json(Array.isArray(filteredSummaries) ? filteredSummaries : []);
  } catch (error) {
    handleError(error, res);
  }
}

export async function searchAll(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

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
        OR: [{ archived: false }, { archived: null }], // Incluir projetos antigos sem flag
      };
      projectWhere.companyId = companyId;
      if (q) {
        projectWhere.AND = projectWhere.AND || [];
        projectWhere.AND.push({
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        });
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

      taskWhere.project = { companyId };

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
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const { status, assigneeId } = req.query as { status?: string; assigneeId?: string };

    if (!status) {
      return res.status(400).json({ error: "Status é obrigatório" });
    }

    const where: any = {
      companyId,
      archived: false,
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
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

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
        companyId,
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

    // Log da criação
    if (userId) {
      logCreate(userId, companyId, "Project", project.id, project).catch(console.error);
    }

    // Disparar webhook
    triggerWebhooks(WEBHOOK_EVENTS.PROJECT_CREATED, project, project.id).catch(console.error);

    res.status(201).json(project);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getProject(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const project = await prisma.project.findFirst({
      where: { id: req.params.id, companyId },
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
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const parse = UpdateProjectSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    // Buscar projeto antigo para comparar mudanças
    const oldProject = await prisma.project.findFirst({
      where: { id: req.params.id, companyId },
    });

    if (!oldProject) {
      return res.status(404).json({ error: "Project not found" });
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

    // Log da atualização
    const userId = req.user?.userId;
    if (userId) {
      logUpdate(userId, companyId, "Project", project.id, oldProject, project).catch(console.error);
      
      // Notificar atualização aos membros do projeto
      notifyProjectUpdated(project.id, project.name, userId).catch(console.error);
    }

    // Disparar webhook
    triggerWebhooks(WEBHOOK_EVENTS.PROJECT_UPDATED, project, project.id).catch(console.error);

    res.json(project);
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteProject(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    // Buscar projeto antes de deletar para webhook
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, companyId },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    await prisma.project.delete({ where: { id: req.params.id } });

    // Disparar webhook
    triggerWebhooks(WEBHOOK_EVENTS.PROJECT_DELETED, project, project.id).catch(console.error);

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

// Arquivar projeto
export async function archiveProject(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { archived: true },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Disparar webhook
    triggerWebhooks(WEBHOOK_EVENTS.PROJECT_ARCHIVED, project, project.id).catch(console.error);

    res.json(project);
  } catch (error) {
    handleError(error, res);
  }
}

// Desarquivar projeto
export async function unarchiveProject(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

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

/**
 * Clona um projeto
 */
export async function cloneProject(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const { id } = req.params;
    const {
      name,
      includeTasks = true,
      includeMembers = true,
      includeSprints = true,
      includeColumns = true,
    } = req.body as {
      name?: string;
      includeTasks?: boolean;
      includeMembers?: boolean;
      includeSprints?: boolean;
      includeColumns?: boolean;
    };

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    // Buscar projeto original
    const originalProject = await prisma.project.findFirst({
      where: { id, companyId },
      include: {
        columns: {
          orderBy: { order: "asc" },
        },
        tasks: includeTasks
          ? {
              include: {
                tags: {
                  include: { tag: true },
                },
              },
              orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            }
          : false,
        sprints: includeSprints
          ? {
              include: {
                tasks: includeTasks,
              },
              orderBy: { startDate: "asc" },
            }
          : false,
        members: includeMembers
          ? {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            }
          : false,
      },
    });

    if (!originalProject) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    // Criar novo projeto
    const newProjectName = name || `${originalProject.name} (Cópia)`;
    const newProject = await prisma.project.create({
      data: {
        companyId,
        name: newProjectName,
        description: originalProject.description || undefined,
        defaultHourlyRate: originalProject.defaultHourlyRate,
        ownerId: userId,
        archived: false,
      },
    });

    // Clonar colunas
    if (includeColumns && originalProject.columns) {
      await prisma.kanbanColumn.createMany({
        data: originalProject.columns.map((col) => ({
          projectId: newProject.id,
          title: col.title,
          status: col.status,
          order: col.order,
        })),
      });
    }

    // Mapear sprints antigas para novas
    const sprintMap = new Map<string, string>();
    if (includeSprints && originalProject.sprints) {
      for (const sprint of originalProject.sprints) {
        const newSprint = await prisma.sprint.create({
          data: {
            projectId: newProject.id,
            name: sprint.name,
            goal: sprint.goal || undefined,
            startDate: sprint.startDate,
            endDate: sprint.endDate,
          },
        });
        sprintMap.set(sprint.id, newSprint.id);
      }
    }

    // Clonar tarefas
    if (includeTasks && originalProject.tasks) {
      for (const task of originalProject.tasks) {
        const newTask = await prisma.task.create({
          data: {
            projectId: newProject.id,
            title: task.title,
            description: task.description || undefined,
            status: task.status,
            estimateHours: task.estimateHours,
            actualHours: 0, // Resetar horas reais
            order: task.order,
            sprintId: task.sprintId && sprintMap.has(task.sprintId)
              ? sprintMap.get(task.sprintId) || undefined
              : undefined,
            // Não clonar assignee, parentId, dependências, etc. por padrão
          },
        });

        // Clonar tags da tarefa
        if (task.tags && task.tags.length > 0) {
          for (const taskTag of task.tags) {
            // Verificar se a tag existe no novo projeto ou criar
            let tag = await prisma.tag.findFirst({
              where: {
                name: taskTag.tag.name,
                projectId: newProject.id,
                companyId,
              },
            });

            if (!tag) {
              tag = await prisma.tag.create({
                data: {
                  name: taskTag.tag.name,
                  color: taskTag.tag.color,
                  projectId: newProject.id,
                  companyId,
                },
              });
            }

            await prisma.taskTag.create({
              data: {
                taskId: newTask.id,
                tagId: tag.id,
              },
            });
          }
        }
      }
    }

    // Clonar membros
    if (includeMembers && originalProject.members) {
      for (const member of originalProject.members) {
        await prisma.projectMember.create({
          data: {
            projectId: newProject.id,
            userId: member.userId,
            role: member.role,
          },
        });
      }
    }

    // Buscar projeto clonado completo
    const clonedProject = await prisma.project.findUnique({
      where: { id: newProject.id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        columns: true,
        tasks: true,
        sprints: true,
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    res.status(201).json(clonedProject);
  } catch (error) {
    handleError(error, res);
  }
}
