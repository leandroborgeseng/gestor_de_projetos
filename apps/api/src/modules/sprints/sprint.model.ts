import { z } from "zod";

export const CreateSprintSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  goal: z.string().optional(),
  startDate: z.string().datetime({ message: "Data de início inválida. Use o formato ISO datetime." }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Data de início inválida")),
  endDate: z.string().datetime({ message: "Data de fim inválida. Use o formato ISO datetime." }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Data de fim inválida")),
});

export const UpdateSprintSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateSprintInput = z.infer<typeof CreateSprintSchema>;
export type UpdateSprintInput = z.infer<typeof UpdateSprintSchema>;

