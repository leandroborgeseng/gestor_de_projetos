import { prisma } from "../db/prisma.js";

export interface NotificationData {
  userId: string;
  companyId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  link?: string;
}

export interface NotificationBatchData {
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  link?: string;
}

/**
 * Cria uma notificação para um usuário
 */
export async function createNotification(data: NotificationData) {
  try {
    return await prisma.notification.create({
      data: {
        userId: data.userId,
        companyId: data.companyId,
        type: data.type,
        title: data.title,
        message: data.message,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        link: data.link || null,
      },
    });
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    return null;
  }
}

/**
 * Cria notificações para múltiplos usuários
 */
export async function createNotificationsForUsers(
  userIds: string[],
  companyId: string,
  notificationData: NotificationBatchData
) {
  try {
    if (userIds.length === 0) return null;

    const notifications = userIds.map((userId) => ({
      userId,
      companyId,
      ...notificationData,
    }));

    return await prisma.notification.createMany({
      data: notifications,
    });
  } catch (error) {
    console.error("Erro ao criar notificações:", error);
    return null;
  }
}

/**
 * Notifica quando uma tarefa é atribuída
 */
export async function notifyTaskAssigned(
  taskId: string,
  taskTitle: string,
  assigneeId: string,
  assignedBy: string,
  projectId?: string
) {
  const assignedByUser = await prisma.user.findUnique({
    where: { id: assignedBy },
    select: { name: true },
  });

  let finalProjectId = projectId;
  if (!finalProjectId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    finalProjectId = task?.projectId;
  }

  if (!finalProjectId) return null;

  const project = await prisma.project.findUnique({
    where: { id: finalProjectId },
    select: { companyId: true },
  });

  if (!project) return null;

  return createNotification({
    userId: assigneeId,
    companyId: project.companyId,
    type: "task_assigned",
    title: "Nova tarefa atribuída",
    message: `${assignedByUser?.name || "Alguém"} atribuiu a tarefa "${taskTitle}" para você`,
    entityType: "Task",
    entityId: taskId,
    link: `/projects/${finalProjectId}/tasks`,
  });
}

/**
 * Notifica quando uma tarefa é atualizada
 */
export async function notifyTaskUpdated(
  taskId: string,
  taskTitle: string,
  updatedBy: string,
  projectId: string
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { companyId: true },
  });

  if (!project) return null;

  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });

  const userIds = projectMembers
    .map((m) => m.userId)
    .filter((id) => id !== updatedBy);

  if (userIds.length === 0) return null;

  const updatedByUser = await prisma.user.findUnique({
    where: { id: updatedBy },
    select: { name: true },
  });

  return createNotificationsForUsers(userIds, project.companyId, {
    type: "task_updated",
    title: "Tarefa atualizada",
    message: `${updatedByUser?.name || "Alguém"} atualizou a tarefa "${taskTitle}"`,
    entityType: "Task",
    entityId: taskId,
    link: `/projects/${projectId}/tasks`,
  });
}

/**
 * Notifica sobre prazos próximos
 */
export async function notifyDeadlineApproaching(
  taskId: string,
  taskTitle: string,
  assigneeId: string,
  daysUntilDeadline: number
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      project: {
        select: { companyId: true, id: true },
      },
    },
  });

  if (!task?.project) return null;

  return createNotification({
    userId: assigneeId,
    companyId: task.project.companyId,
    type: "deadline",
    title: "Prazo próximo",
    message: `A tarefa "${taskTitle}" está com prazo em ${daysUntilDeadline} dia(s)`,
    entityType: "Task",
    entityId: taskId,
    link: `/projects/${task.project.id}/tasks`,
  });
}

/**
 * Notifica quando um projeto é atualizado
 */
export async function notifyProjectUpdated(
  projectId: string,
  projectName: string,
  updatedBy: string
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { companyId: true },
  });

  if (!project) return null;

  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });

  const userIds = projectMembers
    .map((m) => m.userId)
    .filter((id) => id !== updatedBy);

  if (userIds.length === 0) return null;

  const updatedByUser = await prisma.user.findUnique({
    where: { id: updatedBy },
    select: { name: true },
  });

  return createNotificationsForUsers(userIds, project.companyId, {
    type: "project_updated",
    title: "Projeto atualizado",
    message: `${updatedByUser?.name || "Alguém"} atualizou o projeto "${projectName}"`,
    entityType: "Project",
    entityId: projectId,
    link: `/projects/${projectId}`,
  });
}

