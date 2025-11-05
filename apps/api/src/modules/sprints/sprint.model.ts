import { z } from "zod";

export const CreateSprintSchema = z.object({
  name: z.string().min(1),
  goal: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const UpdateSprintSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateSprintInput = z.infer<typeof CreateSprintSchema>;
export type UpdateSprintInput = z.infer<typeof UpdateSprintSchema>;

