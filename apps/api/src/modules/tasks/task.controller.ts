import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateTaskSchema, UpdateTaskSchema, CreateDependencySchema } from "./task.model.js";
import { handleError } from "../../utils/errors.js";
import { logCreate, logUpdate, logDelete, logAction } from "../../services/activityLogger.js";
import { notifyTaskAssigned, notifyTaskUpdated } from "../../services/notificationService.js";
import { triggerWebhooks } from "../../services/webhookService.js";
import { WEBHOOK_EVENTS } from "../webhooks/webhook.model.js";

async function ensureProjectInCompany(projectId: string, companyId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true },
  });
  if (!project) {
    throw Object.assign(new Error("Projeto não encontrado"), { statusCode: 404 });
  }
}

async function ensureTaskInCompany(taskId: string, companyId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { companyId } },
    select: { id: true, projectId: true },
  });
  if (!task) {
    throw Object.assign(new Error("Tarefa não encontrada"), { statusCode: 404 });
  }
  return task;
}

export async function getTasks(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const { projectId } = req.params;
    const { sprintId, status, assigneeId } = req.query as {
      sprintId?: string;
      status?: string;
      assigneeId?: string;
    };

    try {
      await ensureProjectInCompany(projectId, companyId);
    } catch (err) {
      if ((err as any).statusCode) {
        return res.status((err as any).statusCode).json({ error: (err as Error).message });
      }
      throw err;
    }

    const where: any = { projectId };
    if (sprintId) where.sprintId = sprintId;
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;

    const tasks = await prisma.task.findMany({
      where: { ...where, parentId: null, project: { companyId } }, // Apenas tarefas principais (sem parent)
      include: {
        assignee: {
          select: { id: true, name: true, email: true, hourlyRate: true },
        },
        sprint: {
          select: { id: true, name: true },
        },
        resource: true,
        project: {
          select: { id: true, name: true, defaultHourlyRate: true },
        },
        subtasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        predecessorDependencies: {
          include: {
            predecessor: {
              select: { id: true, title: true, status: true },
            },
          },
        },
        successorDependencies: {
          include: {
            successor: {
              select: { id: true, title: true, status: true },
            },
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    res.json(tasks);
  } catch (error) {
    handleError(error, res);
  }
}

export async function createTask(req: Request, res: Response) {
  try {
     const parse = CreateTaskSchema.safeParse(req.body);
     if (!parse.success) {
       return res.status(400).json({ error: parse.error.flatten() });
     }
 
     const { projectId } = req.params;
    const companyId = req.companyId;
    const data = parse.data;

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    try {
      await ensureProjectInCompany(projectId, companyId);
    } catch (err) {
      if ((err as any).statusCode) {
        return res.status((err as any).statusCode).json({ error: (err as Error).message });
      }
      throw err;
    }

    if (data.sprintId) {
      const sprintExists = await prisma.sprint.findFirst({
        where: { id: data.sprintId, projectId, project: { companyId } },
        select: { id: true },
      });
      if (!sprintExists) {
        return res.status(400).json({ error: "Sprint inválida para o projeto selecionado" });
      }
    }

    if (data.parentId) {
      const parentTask = await prisma.task.findFirst({
        where: { id: data.parentId, projectId, project: { companyId } },
        select: { id: true },
      });
      if (!parentTask) {
        return res.status(400).json({ error: "Tarefa pai inválida" });
      }
    }

    if (data.resourceId) {
      const resource = await prisma.resource.findFirst({
        where: { id: data.resourceId, companyId },
        select: { id: true },
      });
      if (!resource) {
        return res.status(400).json({ error: "Recurso inválido para esta empresa" });
      }
    }

    if (data.assigneeId) {
      const membership = await prisma.companyUser.findUnique({
        where: {
          companyId_userId: {
            companyId,
            userId: data.assigneeId,
          },
        },
        select: { userId: true },
      });
      if (!membership) {
        return res.status(400).json({ error: "Responsável não pertence à empresa" });
      }
    }
 
     const task = await prisma.task.create({
       data: {
         ...data,
         projectId,
         startDate: data.startDate ? new Date(data.startDate) : undefined,
         dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
       },
       include: {
         assignee: {
           select: { id: true, name: true, email: true, hourlyRate: true },
         },
         sprint: {
           select: { id: true, name: true },
         },
         resource: true,
         project: {
           select: { id: true, name: true, defaultHourlyRate: true },
         },
         parent: {
           select: { id: true, title: true },
         },
         subtasks: {
           include: {
             assignee: {
               select: { id: true, name: true, email: true },
             },
           },
         },
         tags: {
           include: {
             tag: true,
           },
         },
       },
     });
 
     // Log da criação
     const userId = req.user?.userId;
     if (userId) {
       logCreate(userId, companyId, "Task", task.id, task).catch(console.error);
       
       // Notificar se a tarefa foi atribuída a alguém
       if (task.assigneeId && task.assigneeId !== userId) {
         notifyTaskAssigned(task.id, task.title, task.assigneeId, userId, task.projectId).catch(console.error);
       }
     }
 
     // Disparar webhooks
     triggerWebhooks(WEBHOOK_EVENTS.TASK_CREATED, task, projectId).catch(console.error);
     if (task.assigneeId) {
       triggerWebhooks(WEBHOOK_EVENTS.TASK_ASSIGNED, task, projectId).catch(console.error);
     }
 
     res.status(201).json(task);
   } catch (error) {
     handleError(error, res);
   }
 }

export async function getTask(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const task = await prisma.task.findFirst({
      where: { id: req.params.id, project: { companyId } },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, hourlyRate: true },
        },
        sprint: {
          select: { id: true, name: true },
        },
        resource: true,
        project: {
          select: { id: true, name: true, defaultHourlyRate: true },
        },
        parent: {
          select: { id: true, title: true },
        },
        subtasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        predecessorDependencies: {
          include: {
            predecessor: {
              select: { id: true, title: true, status: true },
            },
          },
        },
        successorDependencies: {
          include: {
            successor: {
              select: { id: true, title: true, status: true },
            },
          },
        },
        timeEntries: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateTask(req: Request, res: Response) {
  try {
     const parse = UpdateTaskSchema.safeParse(req.body);
     if (!parse.success) {
       return res.status(400).json({ error: parse.error.flatten() });
     }
 
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    // Buscar tarefa antiga para comparar mudanças
    let baseTask;
    try {
      baseTask = await ensureTaskInCompany(req.params.id, companyId);
    } catch (err) {
      if ((err as any).statusCode) {
        return res.status((err as any).statusCode).json({ error: (err as Error).message });
      }
      throw err;
    }

    const oldTask = await prisma.task.findFirst({
      where: { id: req.params.id, project: { companyId } },
    });
 
    if (!oldTask) {
      return res.status(404).json({ error: "Task not found" });
    }
 
     const data: any = { ...parse.data };
     if (data.startDate) data.startDate = new Date(data.startDate);
     if (data.dueDate) data.dueDate = new Date(data.dueDate);

    if (data.sprintId) {
      const sprintExists = await prisma.sprint.findFirst({
        where: { id: data.sprintId, projectId: baseTask.projectId, project: { companyId } },
        select: { id: true },
      });
      if (!sprintExists) {
        return res.status(400).json({ error: "Sprint inválida" });
      }
    }

    if (data.parentId) {
      const parentTask = await prisma.task.findFirst({
        where: { id: data.parentId, projectId: baseTask.projectId, project: { companyId } },
        select: { id: true },
      });
      if (!parentTask) {
        return res.status(400).json({ error: "Tarefa pai inválida" });
      }
    }

    if (data.resourceId) {
      const resource = await prisma.resource.findFirst({
        where: { id: data.resourceId, companyId },
        select: { id: true },
      });
      if (!resource) {
        return res.status(400).json({ error: "Recurso inválido" });
      }
    }

    if (data.assigneeId !== undefined) {
      if (data.assigneeId === null) {
        // allow removing assignee
      } else {
        const membership = await prisma.companyUser.findUnique({
          where: {
            companyId_userId: {
              companyId,
              userId: data.assigneeId,
            },
          },
          select: { userId: true },
        });
        if (!membership) {
          return res.status(400).json({ error: "Responsável não pertence à empresa" });
        }
      }
    }
 
     const task = await prisma.task.update({
       where: { id: req.params.id },
       data,
       include: {
         assignee: {
           select: { id: true, name: true, email: true, hourlyRate: true },
         },
         sprint: {
           select: { id: true, name: true },
         },
         resource: true,
         project: {
           select: { id: true, name: true, defaultHourlyRate: true },
         },
         tags: {
           include: {
             tag: true,
           },
         },
       },
     });
 
     // Log da atualização
     const userId = req.user?.userId;
     if (userId) {
       logUpdate(userId, companyId, "Task", task.id, oldTask, task).catch(console.error);
       
       // Notificar se o assignee mudou
       if (oldTask.assigneeId !== task.assigneeId && task.assigneeId) {
         notifyTaskAssigned(task.id, task.title, task.assigneeId, userId, task.projectId).catch(console.error);
       }
       
       // Notificar atualização aos membros do projeto
       if (task.projectId) {
         notifyTaskUpdated(task.id, task.title, userId, task.projectId).catch(console.error);
       }
     }
 
     // Disparar webhooks
     triggerWebhooks(WEBHOOK_EVENTS.TASK_UPDATED, task, task.projectId).catch(console.error);
     
     if (oldTask.status !== task.status) {
       triggerWebhooks(WEBHOOK_EVENTS.TASK_STATUS_CHANGED, {
         oldStatus: oldTask.status,
         newStatus: task.status,
         task,
       }, task.projectId).catch(console.error);
     }
 
     if (oldTask.assigneeId !== task.assigneeId && task.assigneeId) {
       triggerWebhooks(WEBHOOK_EVENTS.TASK_ASSIGNED, task, task.projectId).catch(console.error);
     }
 
     res.json(task);
   } catch (error) {
     handleError(error, res);
   }
 }

export async function deleteTask(req: Request, res: Response) {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    // Buscar tarefa antes de deletar para log
    let baseTask;
    try {
      baseTask = await ensureTaskInCompany(req.params.id, companyId);
    } catch (err) {
      if ((err as any).statusCode) {
        return res.status((err as any).statusCode).json({ error: (err as Error).message });
      }
      throw err;
    }

    const task = await prisma.task.findFirst({
      where: { id: req.params.id, project: { companyId } },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    await prisma.task.delete({ where: { id: req.params.id } });

    // Log da exclusão
    const userId = req.user?.userId;
    if (userId) {
      logDelete(userId, companyId, "Task", task.id, task).catch(console.error);
    }

    // Disparar webhook
    triggerWebhooks(WEBHOOK_EVENTS.TASK_DELETED, task, baseTask.projectId).catch(console.error);

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

// Criar dependência entre tarefas
export async function createDependency(req: Request, res: Response) {
  try {
     const parse = CreateDependencySchema.safeParse(req.body);
     if (!parse.success) {
       return res.status(400).json({ error: parse.error.flatten() });
     }
 
     const { predecessorId, successorId } = parse.data;
    const companyId = req.companyId;

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }
 
     // Verificar se não está criando uma dependência circular
     if (predecessorId === successorId) {
       return res.status(400).json({ error: "Uma tarefa não pode depender de si mesma" });
     }

     const predecessor = await prisma.task.findFirst({
      where: { id: predecessorId, project: { companyId } },
      select: { id: true, projectId: true },
    });
    if (!predecessor) {
      return res.status(404).json({ error: "Tarefa predecessora não encontrada" });
    }

    const successor = await prisma.task.findFirst({
      where: { id: successorId, project: { companyId } },
      select: { id: true, projectId: true },
    });
    if (!successor) {
      return res.status(404).json({ error: "Tarefa sucessora não encontrada" });
    }

    if (predecessor.projectId !== successor.projectId) {
      return res.status(400).json({ error: "Dependências devem pertencer ao mesmo projeto" });
    }
 
     // Verificar se já existe a dependência
     const existing = await prisma.taskDependency.findUnique({
       where: {
         predecessorId_successorId: {
           predecessorId,
           successorId,
         },
       },
     });
 
     if (existing) {
       return res.status(400).json({ error: "Dependência já existe" });
     }
 
     const dependency = await prisma.taskDependency.create({
       data: {
         predecessorId,
         successorId,
       },
       include: {
         predecessor: {
           select: { id: true, title: true, status: true },
         },
         successor: {
           select: { id: true, title: true, status: true },
         },
       },
     });
 
     res.status(201).json(dependency);
   } catch (error) {
     handleError(error, res);
   }
 }

// Remover dependência
export async function deleteDependency(req: Request, res: Response) {
  try {
     const { id } = req.params;
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const dependency = await prisma.taskDependency.findFirst({
      where: {
        id,
        predecessor: { project: { companyId } },
        successor: { project: { companyId } },
      },
    });

    if (!dependency) {
      return res.status(404).json({ error: "Dependência não encontrada" });
    }

    await prisma.taskDependency.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

// Obter dependências de uma tarefa
export async function getTaskDependencies(req: Request, res: Response) {
  try {
     const { id } = req.params;
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    try {
      await ensureTaskInCompany(id, companyId);
    } catch (err) {
      if ((err as any).statusCode) {
        return res.status((err as any).statusCode).json({ error: (err as Error).message });
      }
      throw err;
    }
 
     const task = await prisma.task.findUnique({
      where: { id, project: { companyId } },
      include: {
        predecessorDependencies: {
          include: {
            predecessor: {
              select: { id: true, title: true, status: true },
            },
          },
          where: {
            predecessor: { project: { companyId } },
          },
        },
        successorDependencies: {
          include: {
            successor: {
              select: { id: true, title: true, status: true },
            },
          },
          where: {
            successor: { project: { companyId } },
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({
      predecessors: task.predecessorDependencies.map((dep) => dep.predecessor),
      successors: task.successorDependencies.map((dep) => dep.successor),
      predecessorDependencies: task.predecessorDependencies.map((dep) => ({
        id: dep.id,
        predecessor: dep.predecessor,
      })),
      successorDependencies: task.successorDependencies.map((dep) => ({
        id: dep.id,
        successor: dep.successor,
      })),
    });
  } catch (error) {
    handleError(error, res);
  }
}

