import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateTaskSchema, UpdateTaskSchema, CreateDependencySchema } from "./task.model.js";
import { handleError } from "../../utils/errors.js";

export async function getTasks(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { sprintId, status, assigneeId } = req.query as {
      sprintId?: string;
      status?: string;
      assigneeId?: string;
    };

    const where: any = { projectId };
    if (sprintId) where.sprintId = sprintId;
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;

    const tasks = await prisma.task.findMany({
      where: { ...where, parentId: null }, // Apenas tarefas principais (sem parent)
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
    const data = parse.data;

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
      },
    });

    res.status(201).json(task);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getTask(req: Request, res: Response) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
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

    const data: any = { ...parse.data };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.dueDate) data.dueDate = new Date(data.dueDate);

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
      },
    });

    res.json(task);
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteTask(req: Request, res: Response) {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
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

    // Verificar se não está criando uma dependência circular
    if (predecessorId === successorId) {
      return res.status(400).json({ error: "Uma tarefa não pode depender de si mesma" });
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
    
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
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

