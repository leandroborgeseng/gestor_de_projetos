import { z } from "zod";

export const CreateWebhookSchema = z.object({
  projectId: z.string().optional(),
  url: z.string().url("URL inválida"),
  events: z.array(z.string()).min(1, "Pelo menos um evento é obrigatório"),
  secret: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().optional().default(true),
});

export const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  secret: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
  projectId: z.string().nullable().optional(),
});

export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;

// Eventos disponíveis
export const WEBHOOK_EVENTS = {
  // Tarefas
  TASK_CREATED: "task.created",
  TASK_UPDATED: "task.updated",
  TASK_DELETED: "task.deleted",
  TASK_ASSIGNED: "task.assigned",
  TASK_STATUS_CHANGED: "task.status_changed",
  
  // Projetos
  PROJECT_CREATED: "project.created",
  PROJECT_UPDATED: "project.updated",
  PROJECT_DELETED: "project.deleted",
  PROJECT_ARCHIVED: "project.archived",
  
  // Sprints
  SPRINT_CREATED: "sprint.created",
  SPRINT_UPDATED: "sprint.updated",
  SPRINT_DELETED: "sprint.deleted",
  SPRINT_STARTED: "sprint.started",
  SPRINT_COMPLETED: "sprint.completed",
  
  // Comentários
  COMMENT_CREATED: "comment.created",
  COMMENT_UPDATED: "comment.updated",
  COMMENT_DELETED: "comment.deleted",
} as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS];

