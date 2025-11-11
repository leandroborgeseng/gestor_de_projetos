import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateSprintSchema, UpdateSprintSchema } from "./sprint.model.js";
import { handleError } from "../../utils/errors.js";
import { logCreate, logUpdate, logDelete } from "../../services/activityLogger.js";
import { triggerWebhooks } from "../../services/webhookService.js";
import { WEBHOOK_EVENTS } from "../webhooks/webhook.model.js";

export async function getSprints(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const companyId = req.companyId;

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const sprints = await prisma.sprint.findMany({
      where: { projectId, project: { companyId } },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            estimateHours: true,
            actualHours: true,
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    res.json(sprints);
  } catch (error) {
    handleError(error, res);
  }
}

export async function createSprint(req: Request, res: Response) {
  try {
    const parse = CreateSprintSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { projectId } = req.params;
    const companyId = req.companyId;
    const { startDate, endDate, ...data } = parse.data;

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId },
    });

    if (!project) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    const sprint = await prisma.sprint.create({
      data: {
        ...data,
        projectId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            estimateHours: true,
            actualHours: true,
          },
        },
      },
    });

    // Log da criação
    const userId = req.user?.userId;
    if (userId) {
      logCreate(userId, companyId, "Sprint", sprint.id, sprint).catch(console.error);
    }

    // Disparar webhook
    triggerWebhooks(WEBHOOK_EVENTS.SPRINT_CREATED, sprint, projectId).catch(console.error);

    res.status(201).json(sprint);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getSprint(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const sprint = await prisma.sprint.findFirst({
      where: { id: req.params.id, project: { companyId } },
      include: {
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!sprint) {
      return res.status(404).json({ error: "Sprint not found" });
    }

    res.json(sprint);
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateSprint(req: Request, res: Response) {
  try {
    const parse = UpdateSprintSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    // Buscar sprint antiga para comparar mudanças
    const oldSprint = await prisma.sprint.findFirst({
      where: { id: req.params.id, project: { companyId } },
    });

    if (!oldSprint) {
      return res.status(404).json({ error: "Sprint not found" });
    }

    const data: any = { ...parse.data };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const sprint = await prisma.sprint.update({
      where: { id: req.params.id },
      data,
      include: {
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    // Log da atualização
    const userId = req.user?.userId;
    if (userId) {
      logUpdate(userId, companyId, "Sprint", sprint.id, oldSprint, sprint).catch(console.error);
    }

    // Disparar webhook
    triggerWebhooks(WEBHOOK_EVENTS.SPRINT_UPDATED, sprint, sprint.projectId).catch(console.error);

    res.json(sprint);
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteSprint(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    // Buscar sprint antes de deletar para log
    const sprint = await prisma.sprint.findFirst({
      where: { id: req.params.id, project: { companyId } },
    });

    if (!sprint) {
      return res.status(404).json({ error: "Sprint not found" });
    }

    const projectId = sprint.projectId;

    await prisma.sprint.delete({ where: { id: req.params.id } });

    // Log da exclusão
    const userId = req.user?.userId;
    if (userId) {
      logDelete(userId, companyId, "Sprint", sprint.id, sprint).catch(console.error);
    }

    // Disparar webhook
    triggerWebhooks(WEBHOOK_EVENTS.SPRINT_DELETED, sprint, projectId).catch(console.error);

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

// Adicionar tarefa à sprint
export async function addTaskToSprint(req: Request, res: Response) {
  try {
     const { id: sprintId } = req.params;
     const { taskId } = req.body;
    const companyId = req.companyId;
 
     if (!taskId) {
       return res.status(400).json({ error: "taskId é obrigatório" });
     }

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }
 
     // Verificar se a sprint existe
    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, project: { companyId } },
      select: { id: true, projectId: true },
    });
    if (!sprint) {
      return res.status(404).json({ error: "Sprint não encontrada" });
    }

    const taskExists = await prisma.task.findFirst({
      where: { id: taskId, project: { companyId } },
      select: { id: true },
    });

    if (!taskExists) {
      return res.status(404).json({ error: "Tarefa não encontrada para esta empresa" });
    }

    // Atualizar a tarefa
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { sprintId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(task);
  } catch (error) {
    handleError(error, res);
  }
}

// Remover tarefa da sprint
export async function removeTaskFromSprint(req: Request, res: Response) {
  try {
     const { taskId } = req.params;
    const companyId = req.companyId;

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const taskExists = await prisma.task.findFirst({
      where: { id: taskId, project: { companyId } },
      select: { id: true },
    });

    if (!taskExists) {
      return res.status(404).json({ error: "Tarefa não encontrada" });
    }
 
     const task = await prisma.task.update({
       where: { id: taskId },
       data: { sprintId: null },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(task);
  } catch (error) {
    handleError(error, res);
  }
}

// Obter dados de burndown da sprint
export async function getSprintBurndown(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const companyId = req.companyId;

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const sprint = await prisma.sprint.findFirst({
      where: { id, project: { companyId } },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            estimateHours: true,
            actualHours: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!sprint) {
      return res.status(404).json({ error: "Sprint não encontrada" });
    }

    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calcular horas totais estimadas
    const totalEstimatedHours = sprint.tasks.reduce(
      (sum, task) => sum + (task.estimateHours || 0),
      0
    );

    // Calcular horas totais reais trabalhadas
    const totalActualHours = sprint.tasks.reduce(
      (sum, task) => sum + (task.actualHours || 0),
      0
    );

    // Calcular horas concluídas (tarefas com status DONE)
    const completedHours = sprint.tasks
      .filter((task) => task.status === "DONE")
      .reduce((sum, task) => sum + (task.estimateHours || task.actualHours || 0), 0);

    // Calcular dias da sprint
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysElapsed = Math.max(
      0,
      Math.min(
        Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        totalDays
      )
    );
    const daysRemaining = Math.max(0, totalDays - daysElapsed);

    // Calcular linha ideal (burndown ideal)
    const idealBurndown = [];
    const dailyIdealReduction = totalEstimatedHours / totalDays;

    for (let i = 0; i <= totalDays; i++) {
      idealBurndown.push({
        day: i,
        date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
        idealHours: Math.max(0, totalEstimatedHours - dailyIdealReduction * i),
      });
    }

    // Calcular burndown real (horas restantes por dia)
    const realBurndown = [];
    
    // Para cada dia, calcular horas restantes
    for (let i = 0; i <= Math.min(daysElapsed, totalDays); i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);
      
      // Tarefas completadas até esta data
      const tasksCompletedByDate = sprint.tasks.filter((task) => {
        if (task.status !== "DONE") return false;
        const taskUpdatedAt = new Date(task.updatedAt);
        taskUpdatedAt.setHours(0, 0, 0, 0);
        return taskUpdatedAt <= date;
      });

      const hoursCompletedByDate = tasksCompletedByDate.reduce(
        (sum, task) => sum + (task.estimateHours || task.actualHours || 0),
        0
      );

      const remainingHours = Math.max(0, totalEstimatedHours - hoursCompletedByDate);
      
      realBurndown.push({
        day: i,
        date: date,
        remainingHours: remainingHours,
        completedHours: hoursCompletedByDate,
      });
    }
    
    // Se ainda não chegou ao fim, adicionar ponto atual
    if (daysElapsed < totalDays) {
      const currentDate = new Date(today);
      currentDate.setHours(0, 0, 0, 0);
      const tasksCompletedNow = sprint.tasks.filter((task) => task.status === "DONE");
      const hoursCompletedNow = tasksCompletedNow.reduce(
        (sum, task) => sum + (task.estimateHours || task.actualHours || 0),
        0
      );
      const remainingHoursNow = Math.max(0, totalEstimatedHours - hoursCompletedNow);
      
      realBurndown.push({
        day: daysElapsed,
        date: currentDate,
        remainingHours: remainingHoursNow,
        completedHours: hoursCompletedNow,
      });
    }

    // Projeção de conclusão baseada na velocidade atual
    let velocity = 0;
    if (daysElapsed > 0) {
      velocity = completedHours / daysElapsed;
    }

    const remainingHoursForProjection = Math.max(0, totalEstimatedHours - completedHours);
    const projectedCompletionDays = velocity > 0 
      ? daysElapsed + (remainingHoursForProjection / velocity)
      : totalDays;
    const projectedCompletionDate = new Date(
      startDate.getTime() + projectedCompletionDays * 24 * 60 * 60 * 1000
    );

    res.json({
      sprint: {
        id: sprint.id,
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      },
      metrics: {
        totalEstimatedHours,
        totalActualHours,
        completedHours,
        remainingHours: Math.max(0, totalEstimatedHours - completedHours),
        totalDays,
        daysElapsed,
        daysRemaining,
        velocity,
        projectedCompletionDate,
        isOnTrack: projectedCompletionDate <= endDate,
      },
      idealBurndown,
      realBurndown,
      tasks: sprint.tasks,
    });
  } catch (error) {
    handleError(error, res);
  }
}


/**
 * Clona uma sprint
 */
export async function cloneSprint(req: Request, res: Response) {
  try {
     const { id } = req.params;
     const {
       name,
       projectId,
       includeTasks = true,
       shiftDays = 0, // Deslocar datas em dias
     } = req.body as {
       name?: string;
       projectId?: string;
       includeTasks?: boolean;
       shiftDays?: number;
     };

    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }
 
     // Buscar sprint original
    const originalSprint = await prisma.sprint.findFirst({
      where: { id, project: { companyId } },
      include: {
        tasks: includeTasks
          ? {
              include: {
                tags: {
                  include: { tag: true },
                },
              },
            }
          : false,
        project: {
          select: { id: true, name: true, companyId: true },
        },
      },
    });

    if (!originalSprint) {
      return res.status(404).json({ error: "Sprint não encontrada" });
    }

    const targetProjectId = projectId || originalSprint.projectId;

    const targetProject = await prisma.project.findFirst({
      where: { id: targetProjectId, companyId },
    });

    if (!targetProject) {
      return res.status(404).json({ error: "Projeto destino não encontrado" });
    }

    // Calcular novas datas
    const startDate = new Date(originalSprint.startDate);
    const endDate = new Date(originalSprint.endDate);
    if (shiftDays !== 0) {
      startDate.setDate(startDate.getDate() + shiftDays);
      endDate.setDate(endDate.getDate() + shiftDays);
    }

    // Criar nova sprint
    const newSprintName = name || `${originalSprint.name} (Cópia)`;
    const newSprint = await prisma.sprint.create({
      data: {
        projectId: targetProject.id,
        name: newSprintName,
        goal: originalSprint.goal || undefined,
        startDate,
        endDate,
      },
    });

    // Clonar tarefas
    if (includeTasks && originalSprint.tasks) {
      for (const task of originalSprint.tasks) {
        const newTask = await prisma.task.create({
          data: {
            projectId: targetProject.id,
            title: task.title,
            description: task.description || undefined,
            status: "BACKLOG", // Resetar status para backlog
            estimateHours: task.estimateHours,
            actualHours: 0, // Resetar horas reais
            order: task.order,
            sprintId: newSprint.id,
          },
        });

        // Clonar tags da tarefa
        if (task.tags && task.tags.length > 0) {
          for (const taskTag of task.tags) {
            // Verificar se a tag existe no projeto ou criar
            let tag = await prisma.tag.findFirst({
              where: {
                name: taskTag.tag.name,
                projectId: targetProject.id,
                companyId,
              },
            });

            if (!tag) {
              tag = await prisma.tag.create({
                data: {
                  name: taskTag.tag.name,
                  color: taskTag.tag.color,
                  projectId: targetProject.id,
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

    // Buscar sprint clonada completa
    const clonedSprint = await prisma.sprint.findUnique({
      where: { id: newSprint.id },
      include: {
        tasks: true,
        project: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json(clonedSprint);
  } catch (error) {
    handleError(error, res);
  }
}
