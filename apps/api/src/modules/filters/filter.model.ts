import { z } from "zod";

export const CreateFilterSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  type: z.enum(["tasks", "projects", "sprints"]),
  filters: z.any(), // JSON structure
  isQuick: z.boolean().optional().default(false),
});

export const UpdateFilterSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  filters: z.any().optional(),
  isQuick: z.boolean().optional(),
});

export type CreateFilterInput = z.infer<typeof CreateFilterSchema>;
export type UpdateFilterInput = z.infer<typeof UpdateFilterSchema>;

