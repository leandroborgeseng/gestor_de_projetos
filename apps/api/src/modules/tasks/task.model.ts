import { z } from "zod";

export const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  estimateHours: z.number().nonnegative().default(0),
  assigneeId: z.string().cuid().optional(),
  sprintId: z.string().cuid().optional(),
  resourceId: z.string().cuid().optional(),
  parentId: z.string().cuid().optional(), // Para criar subtarefa
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"]).optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"]).optional(),
  estimateHours: z.number().nonnegative().optional(),
  actualHours: z.number().nonnegative().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  sprintId: z.string().cuid().nullable().optional(),
  resourceId: z.string().cuid().nullable().optional(),
  parentId: z.string().cuid().nullable().optional(), // Para mover como subtarefa
  hourlyRateOverride: z.number().nonnegative().optional(),
  costOverride: z.number().nonnegative().optional(),
  startDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  order: z.number().int().optional(),
});

export const CreateDependencySchema = z.object({
  predecessorId: z.string().cuid(),
  successorId: z.string().cuid(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

