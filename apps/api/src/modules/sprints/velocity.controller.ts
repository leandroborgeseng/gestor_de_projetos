import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { handleError } from "../../utils/errors.js";

/**
 * Calcula velocity de uma sprint específica
 * Velocity = horas realizadas (actualHours) de tarefas concluídas (DONE)
 */
export async function getSprintVelocity(req: Request, res: Response) {
  try {
    const { id: sprintId } = req.params;

    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        tasks: {
          include: {
            assignee: true,
          },
        },
        project: true,
      },
    });

    if (!sprint) {
      return res.status(404).json({ error: "Sprint not found" });
    }

    // Calcular velocity baseado em horas realizadas de tarefas concluídas
    const completedTasks = sprint.tasks.filter((t) => t.status === "DONE");
    const velocity = completedTasks.reduce((sum, task) => {
      return sum + (task.actualHours || task.estimateHours || 0);
    }, 0);

    // Calcular horas planejadas
    const plannedHours = sprint.tasks.reduce((sum, task) => {
      return sum + (task.estimateHours || 0);
    }, 0);

    // Calcular horas realizadas (todas as tarefas, não só concluídas)
    const actualHours = sprint.tasks.reduce((sum, task) => {
      return sum + (task.actualHours || 0);
    }, 0);

    // Taxa de conclusão
    const completionRate = sprint.tasks.length > 0
      ? (completedTasks.length / sprint.tasks.length) * 100
      : 0;

    res.json({
      sprintId: sprint.id,
      sprintName: sprint.name,
      velocity: Math.round(velocity * 100) / 100,
      plannedHours: Math.round(plannedHours * 100) / 100,
      actualHours: Math.round(actualHours * 100) / 100,
      completedTasks: completedTasks.length,
      totalTasks: sprint.tasks.length,
      completionRate: Math.round(completionRate * 100) / 100,
    });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Calcula velocity de todas as sprints de um projeto
 * Retorna histórico de velocity para gráfico
 */
export async function getProjectVelocity(req: Request, res: Response) {
  try {
    const { projectId } = req.params;

    const sprints = await prisma.sprint.findMany({
      where: { projectId },
      include: {
        tasks: {
          include: {
            assignee: true,
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    const velocityData = sprints.map((sprint) => {
      const completedTasks = sprint.tasks.filter((t) => t.status === "DONE");
      const velocity = completedTasks.reduce((sum, task) => {
        return sum + (task.actualHours || task.estimateHours || 0);
      }, 0);

      const plannedHours = sprint.tasks.reduce((sum, task) => {
        return sum + (task.estimateHours || 0);
      }, 0);

      const actualHours = sprint.tasks.reduce((sum, task) => {
        return sum + (task.actualHours || 0);
      }, 0);

      const completionRate = sprint.tasks.length > 0
        ? (completedTasks.length / sprint.tasks.length) * 100
        : 0;

      return {
        sprintId: sprint.id,
        sprintName: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        velocity: Math.round(velocity * 100) / 100,
        plannedHours: Math.round(plannedHours * 100) / 100,
        actualHours: Math.round(actualHours * 100) / 100,
        completedTasks: completedTasks.length,
        totalTasks: sprint.tasks.length,
        completionRate: Math.round(completionRate * 100) / 100,
      };
    });

    // Calcular métricas agregadas
    const velocities = velocityData.map((v) => v.velocity);
    const averageVelocity = velocities.length > 0
      ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length
      : 0;

    // Calcular tendência (últimas 3 sprints)
    const recentSprints = velocityData.slice(-3);
    const recentAverage = recentSprints.length > 0
      ? recentSprints.reduce((sum, v) => sum + v.velocity, 0) / recentSprints.length
      : 0;

    // Previsão para próxima sprint (média das últimas 3 ou média geral)
    const forecast = recentAverage > 0 ? recentAverage : averageVelocity;

    // Calcular variação percentual
    const trend = velocityData.length >= 2
      ? ((recentAverage - averageVelocity) / (averageVelocity || 1)) * 100
      : 0;

    res.json({
      velocityHistory: velocityData,
      metrics: {
        averageVelocity: Math.round(averageVelocity * 100) / 100,
        recentAverage: Math.round(recentAverage * 100) / 100,
        forecast: Math.round(forecast * 100) / 100,
        trend: Math.round(trend * 100) / 100, // Positivo = aumentando, Negativo = diminuindo
        totalSprints: velocityData.length,
      },
    });
  } catch (error) {
    handleError(error, res);
  }
}

