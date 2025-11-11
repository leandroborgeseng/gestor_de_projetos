import { prisma } from "../../db/prisma.js";

export interface Alert {
  id: string;
  type: "task_overdue" | "task_due_soon" | "project_inactive" | "hours_overestimated";
  severity: "high" | "medium" | "low";
  title: string;
  message: string;
  entityType: "Task" | "Project";
  entityId: string;
  entityName: string;
  link?: string;
  createdAt: Date;
}

export interface AlertConfig {
  taskDueSoonDays: number; // Dias antes do prazo para alertar
  projectInactiveDays: number; // Dias sem atividade para considerar projeto inativo
  hoursOverestimateThreshold: number; // Percentual acima do estimado (ex: 1.5 = 50% acima)
}

const DEFAULT_CONFIG: AlertConfig = {
  taskDueSoonDays: 3,
  projectInactiveDays: 7,
  hoursOverestimateThreshold: 1.5,
};

/**
 * Busca configurações de alertas do usuário ou retorna padrões (interna)
 */
async function getUserAlertConfigInternal(userId: string, companyId: string): Promise<AlertConfig> {
  try {
    const config = await prisma.settings.findMany({
      where: {
        key: {
          in: [
            `alert_task_due_soon_days_${companyId}_${userId}`,
            `alert_project_inactive_days_${companyId}_${userId}`,
            `alert_hours_overestimate_threshold_${companyId}_${userId}`,
          ],
        },
      },
    });

    const configMap = new Map(config.map((c) => [c.key, c.value]));

    return {
      taskDueSoonDays: parseInt(
        configMap.get(`alert_task_due_soon_days_${companyId}_${userId}`) ||
          DEFAULT_CONFIG.taskDueSoonDays.toString(),
        10
      ),
      projectInactiveDays: parseInt(
        configMap.get(`alert_project_inactive_days_${companyId}_${userId}`) ||
          DEFAULT_CONFIG.projectInactiveDays.toString(),
        10
      ),
      hoursOverestimateThreshold: parseFloat(
        configMap.get(`alert_hours_overestimate_threshold_${companyId}_${userId}`) ||
          DEFAULT_CONFIG.hoursOverestimateThreshold.toString()
      ),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Busca configurações de alertas do usuário ou retorna padrões (exportada)
 */
export async function getUserAlertConfig(userId: string, companyId: string): Promise<AlertConfig> {
  return getUserAlertConfigInternal(userId, companyId);
}

/**
 * Gera alertas para tarefas atrasadas
 */
async function getOverdueTaskAlerts(userId: string, companyId: string): Promise<Alert[]> {
  const now = new Date();
  const alerts: Alert[] = [];

  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: {
        lt: now,
      },
      status: {
        notIn: ["DONE", "BLOCKED"],
      },
      OR: [
        { assigneeId: userId },
        {
          project: {
            companyId,
            OR: [
              { ownerId: userId },
              {
                members: {
                  some: { userId },
                },
              },
            ],
          },
        },
      ],
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      assignee: {
        select: { id: true, name: true },
      },
    },
  });

  for (const task of overdueTasks) {
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
    );

    alerts.push({
      id: `overdue_${task.id}`,
      type: "task_overdue",
      severity: daysOverdue > 7 ? "high" : daysOverdue > 3 ? "medium" : "low",
      title: "Tarefa Atrasada",
      message: `A tarefa "${task.title}" está ${daysOverdue} dia(s) atrasada`,
      entityType: "Task",
      entityId: task.id,
      entityName: task.title,
      link: `/projects/${task.projectId}/tasks`,
      createdAt: new Date(),
    });
  }

  return alerts;
}

/**
 * Gera alertas para tarefas próximas do prazo
 */
async function getDueSoonTaskAlerts(
  userId: string,
  companyId: string,
  config: AlertConfig
): Promise<Alert[]> {
  const now = new Date();
  const dueSoonDate = new Date(now);
  dueSoonDate.setDate(now.getDate() + config.taskDueSoonDays);

  const alerts: Alert[] = [];

  const dueSoonTasks = await prisma.task.findMany({
    where: {
      dueDate: {
        gte: now,
        lte: dueSoonDate,
      },
      status: {
        notIn: ["DONE", "BLOCKED"],
      },
      OR: [
        { assigneeId: userId },
        {
          project: {
            companyId,
            OR: [
              { ownerId: userId },
              {
                members: {
                  some: { userId },
                },
              },
            ],
          },
        },
      ],
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      assignee: {
        select: { id: true, name: true },
      },
    },
  });

  for (const task of dueSoonTasks) {
    const daysUntilDue = Math.floor(
      (new Date(task.dueDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    alerts.push({
      id: `due_soon_${task.id}`,
      type: "task_due_soon",
      severity: daysUntilDue <= 1 ? "high" : daysUntilDue <= 2 ? "medium" : "low",
      title: "Prazo Próximo",
      message: `A tarefa "${task.title}" vence em ${daysUntilDue} dia(s)`,
      entityType: "Task",
      entityId: task.id,
      entityName: task.title,
      link: `/projects/${task.projectId}/tasks`,
      createdAt: new Date(),
    });
  }

  return alerts;
}

/**
 * Gera alertas para projetos sem atividade
 */
async function getInactiveProjectAlerts(
  userId: string,
  companyId: string,
  config: AlertConfig
): Promise<Alert[]> {
  const now = new Date();
  const inactiveDate = new Date(now);
  inactiveDate.setDate(now.getDate() - config.projectInactiveDays);

  const alerts: Alert[] = [];

  const inactiveProjects = await prisma.project.findMany({
    where: {
      companyId,
      archived: false,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: { userId },
          },
        },
      ],
      updatedAt: {
        lt: inactiveDate,
      },
    },
    include: {
      tasks: {
        where: {
          updatedAt: {
            lt: inactiveDate,
          },
        },
        take: 1,
      },
    },
  });

  for (const project of inactiveProjects) {
    // Verificar se realmente não há atividade recente
    const recentActivity = await prisma.activityLog.findFirst({
      where: {
        entityType: "Project",
        entityId: project.id,
        companyId,
        user: {
          companyMemberships: {
            some: { companyId },
          },
        },
        createdAt: {
          gte: inactiveDate,
        },
      },
    });

    if (!recentActivity && project.tasks.length > 0) {
      const daysInactive = Math.floor(
        (now.getTime() - project.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: `inactive_${project.id}`,
        type: "project_inactive",
        severity: daysInactive > 14 ? "high" : daysInactive > 10 ? "medium" : "low",
        title: "Projeto Sem Atividade",
        message: `O projeto "${project.name}" não tem atividade há ${daysInactive} dia(s)`,
        entityType: "Project",
        entityId: project.id,
        entityName: project.name,
        link: `/projects/${project.id}`,
        createdAt: new Date(),
      });
    }
  }

  return alerts;
}

/**
 * Gera alertas para sobreestimação de horas
 */
async function getOverestimatedHoursAlerts(
  userId: string,
  companyId: string,
  config: AlertConfig
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const tasks = await prisma.task.findMany({
    where: {
      status: {
        notIn: ["DONE", "BLOCKED"],
      },
      estimateHours: {
        gt: 0,
      },
      actualHours: {
        gt: 0,
      },
      OR: [
        { assigneeId: userId },
        {
          project: {
            companyId,
            OR: [
              { ownerId: userId },
              {
                members: {
                  some: { userId },
                },
              },
            ],
          },
        },
      ],
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      assignee: {
        select: { id: true, name: true },
      },
    },
  });

  for (const task of tasks) {
    const ratio = task.actualHours / task.estimateHours;
    if (ratio >= config.hoursOverestimateThreshold) {
      const overestimatePercent = Math.round((ratio - 1) * 100);

      alerts.push({
        id: `overestimate_${task.id}`,
        type: "hours_overestimated",
        severity: ratio >= 2 ? "high" : ratio >= 1.75 ? "medium" : "low",
        title: "Sobreestimação de Horas",
        message: `A tarefa "${task.title}" está ${overestimatePercent}% acima do estimado`,
        entityType: "Task",
        entityId: task.id,
        entityName: task.title,
        link: `/projects/${task.projectId}/tasks`,
        createdAt: new Date(),
      });
    }
  }

  return alerts;
}

/**
 * Gera todos os alertas para um usuário
 */
export async function getUserAlerts(userId: string, companyId: string): Promise<Alert[]> {
  const config = await getUserAlertConfigInternal(userId, companyId);

  const [
    overdueAlerts,
    dueSoonAlerts,
    inactiveProjectAlerts,
    overestimatedHoursAlerts,
  ] = await Promise.all([
    getOverdueTaskAlerts(userId, companyId),
    getDueSoonTaskAlerts(userId, companyId, config),
    getInactiveProjectAlerts(userId, companyId, config),
    getOverestimatedHoursAlerts(userId, companyId, config),
  ]);

  return [
    ...overdueAlerts,
    ...dueSoonAlerts,
    ...inactiveProjectAlerts,
    ...overestimatedHoursAlerts,
  ].sort((a, b) => {
    // Ordenar por severidade (high primeiro) e depois por data
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/**
 * Atualiza configurações de alertas do usuário
 */
export async function updateUserAlertConfig(
  userId: string,
  companyId: string,
  config: Partial<AlertConfig>
): Promise<void> {
  const updates: Promise<any>[] = [];

  if (config.taskDueSoonDays !== undefined) {
    updates.push(
      prisma.settings.upsert({
        where: { key: `alert_task_due_soon_days_${companyId}_${userId}` },
        update: { value: config.taskDueSoonDays.toString() },
        create: {
          key: `alert_task_due_soon_days_${companyId}_${userId}`,
          value: config.taskDueSoonDays.toString(),
        },
      })
    );
  }

  if (config.projectInactiveDays !== undefined) {
    updates.push(
      prisma.settings.upsert({
        where: { key: `alert_project_inactive_days_${companyId}_${userId}` },
        update: { value: config.projectInactiveDays.toString() },
        create: {
          key: `alert_project_inactive_days_${companyId}_${userId}`,
          value: config.projectInactiveDays.toString(),
        },
      })
    );
  }

  if (config.hoursOverestimateThreshold !== undefined) {
    updates.push(
      prisma.settings.upsert({
        where: { key: `alert_hours_overestimate_threshold_${companyId}_${userId}` },
        update: { value: config.hoursOverestimateThreshold.toString() },
        create: {
          key: `alert_hours_overestimate_threshold_${companyId}_${userId}`,
          value: config.hoursOverestimateThreshold.toString(),
        },
      })
    );
  }

  await Promise.all(updates);
}


