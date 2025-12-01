import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateProjectSchema, UpdateProjectSchema } from "./project.model.js";
import { handleError } from "../../utils/errors.js";
import { getPaginationParams } from "../../utils/pagination.js";
import { logCreate, logUpdate, logDelete } from "../../services/activityLogger.js";
import { notifyProjectUpdated } from "../../services/notificationService.js";
import { triggerWebhooks } from "../../services/webhookService.js";
import { WEBHOOK_EVENTS } from "../webhooks/webhook.model.js";
import ExcelJS from "exceljs";
import { getFilePath } from "../../config/upload.js";
import { TaskStatus } from "@prisma/client";

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

    // Verificar se a empresa existe (importante para superadmin)
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ error: "Empresa não encontrada" });
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

    // Log da criação (não bloquear se falhar)
    if (userId) {
      logCreate(userId, companyId, "Project", project.id, project).catch((err) => {
        console.error("Erro ao criar log de atividade:", err);
      });
    }

    // Disparar webhook (não bloquear se falhar)
    triggerWebhooks(WEBHOOK_EVENTS.PROJECT_CREATED, project, project.id).catch((err) => {
      console.error("Erro ao disparar webhook:", err);
    });

    res.status(201).json(project);
  } catch (error: any) {
    console.error("Erro ao criar projeto:", error);
    // Retornar mensagem de erro mais detalhada
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Já existe um projeto com este nome" });
    }
    if (error.code === "P2003") {
      return res.status(400).json({ error: "Referência inválida (empresa ou usuário não encontrado)" });
    }
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

/**
 * Importa projeto e tarefas de um arquivo Excel exportado do Monday.com
 */
export async function importFromMondayExcel(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Arquivo Excel é obrigatório" });
    }

    const { projectName, projectDescription, defaultHourlyRate } = req.body;

    if (!projectName) {
      return res.status(400).json({ error: "Nome do projeto é obrigatório" });
    }

    // Ler arquivo Excel
    const workbook = new ExcelJS.Workbook();
    const filePath = getFilePath(file.filename);
    await workbook.xlsx.readFile(filePath);

    // Pegar primeira planilha
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ error: "Planilha vazia ou inválida" });
    }

    // Ler cabeçalhos (primeira linha)
    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value?.toString() || "";
    });

    // Mapear colunas do Monday.com para nossos campos
    const columnMap: Record<string, string> = {};
    headers.forEach((header, index) => {
      const headerLower = header.toLowerCase().trim();
      if (headerLower.includes("name") || headerLower.includes("item")) {
        columnMap.name = header;
      } else if (headerLower.includes("status") || headerLower.includes("estado")) {
        columnMap.status = header;
      } else if (headerLower.includes("person") || headerLower.includes("assignee") || headerLower.includes("responsável")) {
        columnMap.assignee = header;
      } else if (headerLower.includes("date") || headerLower.includes("data")) {
        columnMap.date = header;
      } else if (headerLower.includes("due") || headerLower.includes("prazo")) {
        columnMap.dueDate = header;
      } else if (headerLower.includes("description") || headerLower.includes("descrição") || headerLower.includes("notes") || headerLower.includes("notas")) {
        columnMap.description = header;
      } else if (headerLower.includes("hours") || headerLower.includes("horas")) {
        columnMap.hours = header;
      }
    });

    if (!columnMap.name) {
      return res.status(400).json({ error: "Coluna 'Name' ou 'Item Name' não encontrada no Excel" });
    }

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: projectName,
        description: projectDescription || undefined,
        defaultHourlyRate: defaultHourlyRate ? parseFloat(defaultHourlyRate) : undefined,
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

    // Mapear status do Monday.com para nossos status
    const statusMap: Record<string, TaskStatus> = {
      "backlog": "BACKLOG",
      "todo": "TODO",
      "to do": "TODO",
      "in progress": "IN_PROGRESS",
      "working on it": "IN_PROGRESS",
      "review": "REVIEW",
      "done": "DONE",
      "completed": "DONE",
      "blocked": "BLOCKED",
    };

    // Ler tarefas (a partir da segunda linha)
    const tasks = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowData: Record<string, any> = {};

      headers.forEach((header, index) => {
        const cell = row.getCell(index + 1);
        rowData[header] = cell.value;
      });

      const taskName = rowData[columnMap.name]?.toString()?.trim();
      if (!taskName) {
        continue; // Pular linhas vazias
      }

      try {
        // Mapear status
        let status: TaskStatus = "BACKLOG";
        if (columnMap.status) {
          const statusValue = rowData[columnMap.status]?.toString()?.toLowerCase().trim() || "";
          status = statusMap[statusValue] || "BACKLOG";
        }

        // Mapear assignee (buscar usuário por email ou nome)
        let assigneeId: string | undefined = undefined;
        if (columnMap.assignee) {
          const assigneeValue = rowData[columnMap.assignee]?.toString()?.trim();
          if (assigneeValue) {
            // Tentar encontrar por email primeiro
            const user = await prisma.user.findFirst({
              where: {
                companyMemberships: {
                  some: {
                    companyId,
                  },
                },
                OR: [
                  { email: { contains: assigneeValue, mode: "insensitive" } },
                  { name: { contains: assigneeValue, mode: "insensitive" } },
                ],
              },
            });
            if (user) {
              assigneeId = user.id;
            }
          }
        }

        // Mapear datas
        let startDate: Date | undefined = undefined;
        let dueDate: Date | undefined = undefined;

        // Função auxiliar para converter datas do Excel
        const parseExcelDate = (value: any): Date | undefined => {
          if (!value) return undefined;
          
          if (value instanceof Date) {
            return value;
          }
          
          if (typeof value === "number") {
            // Excel date serial number (dias desde 1900-01-01)
            // ExcelJS armazena datas como números
            const excelEpoch = new Date(1899, 11, 30);
            const days = Math.floor(value);
            const milliseconds = (value - days) * 86400000;
            return new Date(excelEpoch.getTime() + days * 86400000 + milliseconds);
          }
          
          if (typeof value === "string") {
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) {
              return parsed;
            }
          }
          
          return undefined;
        };

        if (columnMap.date) {
          startDate = parseExcelDate(rowData[columnMap.date]);
        }

        if (columnMap.dueDate) {
          dueDate = parseExcelDate(rowData[columnMap.dueDate]);
        }

        // Mapear horas estimadas
        let estimateHours = 0;
        if (columnMap.hours) {
          const hoursValue = rowData[columnMap.hours];
          if (hoursValue) {
            const parsed = parseFloat(hoursValue.toString());
            if (!isNaN(parsed)) {
              estimateHours = parsed;
            }
          }
        }

        // Criar tarefa
        const task = await prisma.task.create({
          data: {
            projectId: project.id,
            title: taskName,
            description: columnMap.description ? rowData[columnMap.description]?.toString() : undefined,
            status,
            estimateHours,
            assigneeId,
            startDate,
            dueDate,
            order: tasks.length,
          },
        });

        tasks.push(task);
      } catch (error: any) {
        errors.push({
          row: rowNumber,
          error: error.message || "Erro ao processar tarefa",
        });
      }
    }

    // Log da criação
    if (userId) {
      await logCreate(userId, companyId, "Project", project.id, {
        name: project.name,
        importedTasks: tasks.length,
      });
    }

    // Deletar arquivo temporário
    try {
      const fs = await import("fs");
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      // Ignorar erro ao deletar arquivo
    }

    res.status(201).json({
      project,
      importedTasks: tasks.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `${tasks.length} tarefa(s) importada(s) com sucesso${errors.length > 0 ? `, ${errors.length} erro(s)` : ""}`,
    });
  } catch (error) {
    handleError(error, res);
  }
}
