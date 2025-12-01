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
import crypto from "crypto";

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

    // Verificar se o usuário é superadmin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

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
        members: {
          create: [
            // Adicionar o criador como membro
            { userId, role: "PROJECT_MANAGER" },
          ],
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Se o criador não for superadmin, adicionar superadmin como membro
    if (user?.role !== "SUPERADMIN") {
      try {
        const superadmin = await prisma.user.findFirst({
          where: { role: "SUPERADMIN" },
          select: { id: true },
        });

        if (superadmin) {
          // Verificar se já não é membro (pode acontecer se o owner já for superadmin)
          const existingMember = await prisma.projectMember.findUnique({
            where: {
              projectId_userId: {
                projectId: project.id,
                userId: superadmin.id,
              },
            },
          });

          if (!existingMember) {
            await prisma.projectMember.create({
              data: {
                projectId: project.id,
                userId: superadmin.id,
                role: "PROJECT_MANAGER",
              },
            });
          }
        }
      } catch (err: any) {
        // Não bloquear a criação do projeto se falhar ao adicionar superadmin
        console.error("Erro ao adicionar superadmin ao projeto (não crítico):", err);
      }
    }

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
    console.error("❌ Erro ao criar projeto:", error);
    console.error("❌ Detalhes do erro:", {
      code: error.code,
      meta: error.meta,
      message: error.message,
      stack: error.stack,
    });
    
    // Retornar mensagem de erro mais detalhada
    if (error.code === "P2002") {
      return res.status(400).json({ 
        error: "Já existe um projeto com este nome",
        details: error.meta?.target,
      });
    }
    if (error.code === "P2003") {
      return res.status(400).json({ 
        error: "Referência inválida (empresa ou usuário não encontrado)",
        details: error.meta?.field_name,
      });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ 
        error: "Registro não encontrado",
        details: error.meta?.cause,
      });
    }
    
    // Retornar mensagem de erro mais útil
    const errorMessage = error.message || "Erro ao criar projeto";
    return res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
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

/**
 * Gera um token único para acesso público ao relatório do projeto
 */
function generatePublicReportToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Download de template Excel para importação de tarefas
 */
export async function downloadImportTemplate(req: Request, res: Response) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Tarefas");

    // Definir cabeçalhos
    worksheet.columns = [
      { header: "Nome da Tarefa", key: "name", width: 40 },
      { header: "Status", key: "status", width: 15 },
      { header: "Responsável", key: "assignee", width: 25 },
      { header: "Data de Início", key: "startDate", width: 15 },
      { header: "Data de Vencimento", key: "dueDate", width: 18 },
      { header: "Horas Estimadas", key: "estimateHours", width: 15 },
      { header: "Descrição", key: "description", width: 50 },
    ];

    // Estilizar cabeçalhos
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Adicionar linhas de exemplo
    worksheet.addRow({
      name: "Exemplo de tarefa 1",
      status: "TODO",
      assignee: "Nome do responsável ou email",
      startDate: "2024-01-15",
      dueDate: "2024-01-30",
      estimateHours: 8,
      description: "Descrição detalhada da tarefa",
    });

    worksheet.addRow({
      name: "Exemplo de tarefa 2",
      status: "IN_PROGRESS",
      assignee: "outro@email.com",
      startDate: "2024-01-20",
      dueDate: "2024-02-05",
      estimateHours: 16,
      description: "Outra descrição",
    });

    // Adicionar nota explicativa
    worksheet.addRow({});
    worksheet.addRow({ name: "NOTAS:" });
    worksheet.addRow({ name: "- Status válidos: BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE, BLOCKED" });
    worksheet.addRow({ name: "- Responsável pode ser nome ou email do usuário" });
    worksheet.addRow({ name: "- Datas no formato: YYYY-MM-DD ou DD/MM/YYYY" });
    worksheet.addRow({ name: "- Horas estimadas devem ser números" });
    worksheet.addRow({ name: "- A coluna 'Nome da Tarefa' é obrigatória" });

    // Configurar resposta para Excel
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="template-importacao-tarefas.xlsx"'
    );

    // Escrever Excel no buffer e enviar
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Gera ou regenera token de acesso público ao relatório do projeto
 */
export async function generatePublicReportTokenEndpoint(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: "ID do projeto é obrigatório" });
    }

    // Verificar se o projeto existe e pertence à empresa
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    // Gerar novo token
    const token = generatePublicReportToken();

    // Atualizar projeto com o token
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { publicReportToken: token },
    });

    res.json({
      token,
      publicUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/public/project/${token}`,
      message: "Token gerado com sucesso",
    });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Relatório público do projeto (acesso via token)
 */
export async function getPublicProjectReport(req: Request, res: Response) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: "Token é obrigatório" });
    }

    // Buscar projeto pelo token
    const project = await prisma.project.findUnique({
      where: { publicReportToken: token },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            primaryColor: true,
            secondaryColor: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            tags: {
              include: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
            },
            sprint: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
          orderBy: [
            { order: "asc" },
            { createdAt: "asc" },
          ],
        },
        sprints: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            goal: true,
          },
          orderBy: { startDate: "desc" },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Projeto não encontrado ou token inválido" });
    }

    // Calcular estatísticas
    const totalTasks = project.tasks.length;
    const tasksByStatus = {
      BACKLOG: project.tasks.filter((t) => t.status === "BACKLOG").length,
      TODO: project.tasks.filter((t) => t.status === "TODO").length,
      IN_PROGRESS: project.tasks.filter((t) => t.status === "IN_PROGRESS").length,
      REVIEW: project.tasks.filter((t) => t.status === "REVIEW").length,
      DONE: project.tasks.filter((t) => t.status === "DONE").length,
      BLOCKED: project.tasks.filter((t) => t.status === "BLOCKED").length,
    };

    const completedTasks = tasksByStatus.DONE;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calcular horas
    const totalEstimateHours = project.tasks.reduce(
      (sum, t) => sum + (Number(t.estimateHours) || 0),
      0
    );
    const totalActualHours = project.tasks.reduce(
      (sum, t) => sum + (Number(t.actualHours) || 0),
      0
    );

    // Tarefas por responsável
    const tasksByAssignee = project.tasks.reduce((acc, task) => {
      const assigneeId = task.assigneeId || "unassigned";
      const assigneeName = task.assignee?.name || "Sem responsável";
      if (!acc[assigneeId]) {
        acc[assigneeId] = {
          id: assigneeId,
          name: assigneeName,
          email: task.assignee?.email,
          total: 0,
          completed: 0,
          inProgress: 0,
          hours: 0,
        };
      }
      acc[assigneeId].total++;
      if (task.status === "DONE") acc[assigneeId].completed++;
      if (task.status === "IN_PROGRESS") acc[assigneeId].inProgress++;
      acc[assigneeId].hours += Number(task.estimateHours) || 0;
      return acc;
    }, {} as Record<string, any>);

    // Tarefas atrasadas
    const now = new Date();
    const overdueTasks = project.tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE"
    );

    // Próximas tarefas a vencer (próximos 7 dias)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingTasks = project.tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) >= now &&
        new Date(t.dueDate) <= nextWeek &&
        t.status !== "DONE"
    );

    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      company: project.company,
      owner: project.owner,
      statistics: {
        totalTasks,
        tasksByStatus,
        completionPercentage,
        totalEstimateHours,
        totalActualHours,
        overdueTasks: overdueTasks.length,
        upcomingTasks: upcomingTasks.length,
      },
      tasksByAssignee: Object.values(tasksByAssignee),
      tasks: project.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        assignee: task.assignee,
        startDate: task.startDate,
        dueDate: task.dueDate,
        estimateHours: task.estimateHours,
        actualHours: task.actualHours,
        progress: task.progress,
        tags: task.tags.map((tt) => tt.tag),
        sprint: task.sprint,
        order: task.order,
        isOverdue: task.dueDate && new Date(task.dueDate) < now && task.status !== "DONE",
      })),
      sprints: project.sprints,
      members: project.members.map((m) => m.user),
      overdueTasks: overdueTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        assignee: t.assignee,
        status: t.status,
      })),
      upcomingTasks: upcomingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        assignee: t.assignee,
        status: t.status,
      })),
    });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Importa tarefas de um arquivo Excel para um projeto existente
 */
export async function importTasksFromExcel(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: "ID do projeto é obrigatório" });
    }

    // Verificar se o projeto existe e pertence à empresa
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Arquivo Excel é obrigatório" });
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
    // Usar Map para manter a relação colNumber -> header
    const headersMap = new Map<number, string>();
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const headerValue = cell.value?.toString()?.trim() || "";
      if (headerValue) {
        headersMap.set(colNumber, headerValue);
      }
    });
    
    // Criar array de headers para compatibilidade
    const headers: string[] = [];
    const maxCol = Math.max(...Array.from(headersMap.keys()));
    for (let i = 1; i <= maxCol; i++) {
      headers[i] = headersMap.get(i) || "";
    }

    // Log das colunas encontradas para debug
    console.log("📋 Colunas encontradas no Excel:", headers.filter(h => h));

    // Mapear colunas do Excel para nossos campos
    // Usar Map para manter a relação header -> colNumber
    const columnMap: Record<string, number> = {};
    
    headersMap.forEach((header, colNumber) => {
      if (!header) return;
      
      const headerLower = header.toLowerCase().trim();
      
      // Nome da tarefa
      if (headerLower === "nome da tarefa" || headerLower === "name" || headerLower === "nome" || 
          headerLower === "item name" || headerLower === "tarefa" ||
          (headerLower.includes("nome") && headerLower.includes("tarefa")) ||
          (headerLower.includes("item") && headerLower.includes("name"))) {
        if (!columnMap.name) {
          columnMap.name = colNumber;
        }
      }
      // Status
      else if (headerLower === "status" || headerLower === "estado" || 
               headerLower.includes("status")) {
        if (!columnMap.status) {
          columnMap.status = colNumber;
        }
      }
      // Pessoa responsável
      else if (headerLower === "responsável" || headerLower === "responsavel" ||
               headerLower === "person" || headerLower === "people" || 
               headerLower === "assignee" || headerLower === "atribuído" ||
               headerLower === "atribuido" || headerLower.includes("respons") ||
               headerLower.includes("person") || headerLower.includes("people") || 
               headerLower.includes("assignee")) {
        if (!columnMap.assignee) {
          columnMap.assignee = colNumber;
        }
      }
      // Data de vencimento
      else if (headerLower === "data de vencimento" || headerLower === "due date" || 
               headerLower === "prazo" || headerLower === "vencimento" || 
               (headerLower.includes("due") && headerLower.includes("date")) ||
               (headerLower.includes("vencimento"))) {
        if (!columnMap.dueDate) {
          columnMap.dueDate = colNumber;
        }
      }
      // Data de início
      else if (headerLower === "data de início" || headerLower === "data de inicio" ||
               headerLower === "start date" || headerLower === "início" ||
               headerLower === "inicio" ||
               (headerLower.includes("start") && headerLower.includes("date")) ||
               (headerLower.includes("início") || headerLower.includes("inicio"))) {
        if (!columnMap.startDate) {
          columnMap.startDate = colNumber;
        }
      }
      // Data genérica
      else if (headerLower === "date" || headerLower === "data") {
        if (!columnMap.date && !columnMap.dueDate && !columnMap.startDate) {
          columnMap.date = colNumber;
        }
      }
      // Descrição
      else if (headerLower === "descrição" || headerLower === "descricao" ||
               headerLower === "description" || headerLower === "notes" || 
               headerLower === "note" || headerLower === "observação" ||
               headerLower === "observacao" || headerLower.includes("descri") ||
               headerLower.includes("notes") || headerLower.includes("description")) {
        if (!columnMap.description) {
          columnMap.description = colNumber;
        }
      }
      // Horas estimadas
      else if (headerLower === "horas estimadas" || headerLower === "hours" || 
               headerLower === "horas" || headerLower === "estimativa" ||
               headerLower === "estimate hours" || headerLower === "numbers" ||
               headerLower === "números" || headerLower === "numeros" ||
               headerLower.includes("horas") || headerLower.includes("hours") ||
               headerLower.includes("estimativa")) {
        if (!columnMap.hours) {
          columnMap.hours = colNumber;
        }
      }
    });

    // Log do mapeamento para debug
    const columnMapDebug: Record<string, string> = {};
    Object.keys(columnMap).forEach(key => {
      const colNum = columnMap[key as keyof typeof columnMap];
      columnMapDebug[key] = `${headersMap.get(colNum)} (coluna ${colNum})`;
    });
    console.log("🗺️ Mapeamento de colunas:", columnMapDebug);
    console.log("📊 Total de linhas na planilha:", worksheet.rowCount);
    console.log("📋 Colunas encontradas:", Array.from(headersMap.values()));

    if (!columnMap.name) {
      return res.status(400).json({ 
        error: "Coluna 'Nome da Tarefa' não encontrada no Excel",
        foundColumns: Array.from(headersMap.values()),
        suggestion: "O arquivo deve conter uma coluna com o nome da tarefa. Baixe o template em: /projects/import/template",
        columnMapping: columnMapDebug
      });
    }
    
    // Verificar se há dados nas colunas mapeadas (verificar primeira linha de dados)
    if (worksheet.rowCount < 2) {
      return res.status(400).json({ 
        error: "O arquivo Excel não contém dados. A planilha deve ter pelo menos uma linha de dados além do cabeçalho.",
        foundColumns: Array.from(headersMap.values()),
        columnMapping: columnMapDebug
      });
    }
    
    // Verificar se a primeira linha de dados tem conteúdo na coluna de nome
    const firstDataRow = worksheet.getRow(2);
    const firstNameCell = firstDataRow.getCell(columnMap.name);
    const firstNameValue = firstNameCell.value;
    
    if (!firstNameValue || firstNameValue === "" || firstNameValue === null || firstNameValue === undefined) {
      return res.status(400).json({ 
        error: "A coluna 'Nome da Tarefa' não contém dados. Verifique se há tarefas na planilha.",
        foundColumns: Array.from(headersMap.values()),
        columnMapping: columnMapDebug,
        hint: "A primeira linha de dados (linha 2) está vazia na coluna de nome da tarefa."
      });
    }

    // Mapear status do Monday.com para nossos status
    const statusMap: Record<string, TaskStatus> = {
      "backlog": "BACKLOG",
      "todo": "TODO",
      "to do": "TODO",
      "a fazer": "TODO",
      "in progress": "IN_PROGRESS",
      "working on it": "IN_PROGRESS",
      "em progresso": "IN_PROGRESS",
      "review": "REVIEW",
      "revisão": "REVIEW",
      "done": "DONE",
      "completed": "DONE",
      "feito": "DONE",
      "concluído": "DONE",
      "concluido": "DONE",
      "blocked": "BLOCKED",
      "parado": "BLOCKED",
      "bloqueado": "BLOCKED",
    };

    // Função auxiliar para converter datas do Excel
    const parseExcelDate = (value: any): Date | undefined => {
      if (!value) return undefined;
      
      if (value instanceof Date) {
        return value;
      }
      
      if (typeof value === "number") {
        const excelEpoch = new Date(1899, 11, 30);
        const days = Math.floor(value);
        const milliseconds = (value - days) * 86400000;
        return new Date(excelEpoch.getTime() + days * 86400000 + milliseconds);
      }
      
      if (typeof value === "string") {
        const formats = [
          /(\d{2})\/(\d{2})\/(\d{4})/,
          /(\d{4})-(\d{2})-(\d{2})/,
          /(\d{2})-(\d{2})-(\d{4})/,
        ];
        
        for (const format of formats) {
          const match = value.match(format);
          if (match) {
            if (format === formats[0] || format === formats[2]) {
              return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
            } else {
              return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            }
          }
        }
        
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      
      return undefined;
    };

    // Buscar usuários da empresa para mapeamento
    const companyUsers = await prisma.user.findMany({
      where: {
        companyMemberships: {
          some: {
            companyId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Ler tarefas (a partir da segunda linha)
    const tasks = [];
    const errors: Array<{ row: number; error: string }> = [];
    let order = 0;

    // Buscar última ordem de tarefa no projeto
    const lastTask = await prisma.task.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    if (lastTask) {
      order = lastTask.order + 1;
    }

    // Função auxiliar para ler valor de célula
    const getCellValue = (colNumber: number | undefined, row: any): any => {
      if (!colNumber) return undefined;
      const cell = row.getCell(colNumber);
      let value = cell.value;
      
      // Se a célula estiver vazia, retornar undefined
      if (value === null || value === undefined || value === "") {
        return undefined;
      }
      
      // Se for um objeto rich text, pegar o texto
      if (value && typeof value === 'object' && 'richText' in value) {
        value = (value as any).richText.map((rt: any) => rt.text).join('');
      }
      
      // Se for um array, pegar o primeiro elemento
      if (Array.isArray(value)) {
        value = value[0];
      }
      
      return value;
    };

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      // Obter nome da tarefa diretamente da coluna mapeada
      const nameColNumber = columnMap.name;
      if (!nameColNumber) {
        console.log(`⚠️ Linha ${rowNumber}: Coluna de nome não mapeada, pulando...`);
        continue;
      }
      
      const taskNameValue = getCellValue(nameColNumber, row);
      const taskName = taskNameValue?.toString()?.trim();
      
      if (!taskName || taskName === "" || taskName === "undefined" || taskName === "null") {
        console.log(`⚠️ Linha ${rowNumber}: Nome da tarefa vazio, pulando...`);
        continue; // Pular linhas vazias
      }

      console.log(`📝 Processando linha ${rowNumber}: "${taskName}"`);

      try {
        // Mapear status
        let status: TaskStatus = "BACKLOG";
        if (columnMap.status) {
          const statusValue = getCellValue(columnMap.status, row)?.toString()?.toLowerCase().trim() || "";
          // Tentar mapear status
          status = statusMap[statusValue] || "BACKLOG";
          
          // Se não encontrou, tentar buscar por palavras-chave no valor
          if (status === "BACKLOG" && statusValue) {
            if (statusValue.includes("done") || statusValue.includes("feito") || 
                statusValue.includes("concluído") || statusValue.includes("concluido") ||
                statusValue.includes("completed")) {
              status = "DONE";
            } else if (statusValue.includes("progress") || statusValue.includes("progresso") ||
                       statusValue.includes("working")) {
              status = "IN_PROGRESS";
            } else if (statusValue.includes("blocked") || statusValue.includes("bloqueado") ||
                       statusValue.includes("parado")) {
              status = "BLOCKED";
            } else if (statusValue.includes("review") || statusValue.includes("revisão") ||
                       statusValue.includes("revisao")) {
              status = "REVIEW";
            } else if (statusValue.includes("todo") || statusValue.includes("fazer")) {
              status = "TODO";
            }
          }
        }

        // Mapear assignee
        let assigneeId: string | undefined = undefined;
        if (columnMap.assignee) {
          let assigneeValue = getCellValue(columnMap.assignee, row);
          
          assigneeValue = assigneeValue?.toString()?.trim();
          
          if (assigneeValue) {
            // Tentar encontrar por email primeiro
            let user = companyUsers.find(
              (u) => u.email?.toLowerCase() === assigneeValue.toLowerCase()
            );
            
            // Se não encontrou por email, tentar por nome
            if (!user) {
              user = companyUsers.find(
                (u) => {
                  const nameLower = u.name?.toLowerCase() || "";
                  const valueLower = assigneeValue.toLowerCase();
                  return nameLower.includes(valueLower) || valueLower.includes(nameLower) ||
                         nameLower === valueLower;
                }
              );
            }
            
            // Se ainda não encontrou, tentar extrair email do texto
            if (!user && assigneeValue.includes("@")) {
              const emailMatch = assigneeValue.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
              if (emailMatch) {
                user = companyUsers.find(
                  (u) => u.email?.toLowerCase() === emailMatch[1].toLowerCase()
                );
              }
            }
            
            if (user) {
              assigneeId = user.id;
            }
          }
        }

        // Mapear datas
        let startDate: Date | undefined = undefined;
        let dueDate: Date | undefined = undefined;

        if (columnMap.startDate) {
          startDate = parseExcelDate(getCellValue(columnMap.startDate, row));
        } else if (columnMap.date) {
          startDate = parseExcelDate(getCellValue(columnMap.date, row));
        }

        if (columnMap.dueDate) {
          dueDate = parseExcelDate(getCellValue(columnMap.dueDate, row));
        } else if (columnMap.date && !startDate) {
          dueDate = parseExcelDate(getCellValue(columnMap.date, row));
        }

        // Mapear horas estimadas
        let estimateHours = 0;
        if (columnMap.hours) {
          let hoursValue = getCellValue(columnMap.hours, row);
          
          // Se for um número do Excel, usar diretamente
          if (typeof hoursValue === "number") {
            estimateHours = hoursValue;
          } else if (hoursValue) {
            // Remover caracteres não numéricos exceto vírgula e ponto
            const cleaned = hoursValue.toString().replace(/[^\d,.-]/g, "").replace(",", ".");
            const parsed = parseFloat(cleaned);
            if (!isNaN(parsed) && parsed > 0) {
              estimateHours = parsed;
            }
          }
        }

        // Mapear descrição
        let description: string | undefined = undefined;
        if (columnMap.description) {
          const descValue = getCellValue(columnMap.description, row);
          description = descValue?.toString()?.trim() || undefined;
        }
        
        // Criar tarefa
        const task = await prisma.task.create({
          data: {
            projectId: project.id,
            title: taskName,
            description,
            status,
            estimateHours,
            assigneeId,
            startDate,
            dueDate,
            order: order++,
          },
        });

        tasks.push(task);

        // Log da criação
        if (userId) {
          logCreate(userId, companyId, "Task", task.id, task).catch((err) => {
            console.error("Erro ao criar log de atividade:", err);
          });
        }
      } catch (error: any) {
        console.error(`❌ Erro ao processar linha ${rowNumber}:`, error);
        errors.push({
          row: rowNumber,
          error: error.message || "Erro ao processar tarefa",
        });
      }
    }

    console.log(`✅ Importação concluída: ${tasks.length} tarefas criadas, ${errors.length} erros`);

    // Deletar arquivo temporário
    try {
      const fs = await import("fs");
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      // Ignorar erro ao deletar arquivo
    }

    res.status(200).json({
      project: {
        id: project.id,
        name: project.name,
      },
      tasks,
      imported: tasks.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `${tasks.length} tarefa(s) importada(s) com sucesso${errors.length > 0 ? ` (${errors.length} erro(s))` : ""}`,
      columnMapping: columnMap, // Retornar mapeamento para debug
    });
  } catch (error: any) {
    console.error("❌ Erro na importação:", error);
    res.status(500).json({
      error: error.message || "Erro ao importar tarefas",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}

/**
 * Endpoint de debug para inspecionar o formato do arquivo Excel antes de importar
 */
export async function inspectMondayExcel(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Arquivo Excel é obrigatório" });
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

    // Ler cabeçalhos
    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber] = cell.value?.toString()?.trim() || "";
    });

    // Ler primeiras 5 linhas de dados para exemplo
    const sampleRows: any[] = [];
    for (let rowNumber = 2; rowNumber <= Math.min(6, worksheet.rowCount); rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowData: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        if (header) {
          const cell = row.getCell(index + 1);
          let value = cell.value;
          
          if (value && typeof value === 'object' && 'richText' in value) {
            value = value.richText.map((rt: any) => rt.text).join('');
          }
          
          rowData[header] = value;
        }
      });
      
      sampleRows.push(rowData);
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

    res.status(200).json({
      totalRows: worksheet.rowCount - 1, // Excluindo cabeçalho
      columns: headers.filter(h => h),
      sampleRows,
      message: "Arquivo inspecionado com sucesso. Use essas informações para verificar o formato antes de importar.",
    });
  } catch (error: any) {
    console.error("❌ Erro ao inspecionar arquivo:", error);
    res.status(500).json({
      error: error.message || "Erro ao inspecionar arquivo",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
