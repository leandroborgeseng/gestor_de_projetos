import { z } from "zod";

export const CreateResourceSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  unitCost: z.number().nonnegative(),
  unit: z.string().min(1),
  notes: z.string().optional(),
});

export const UpdateResourceSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  unitCost: z.number().nonnegative().optional(),
  unit: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;
export type UpdateResourceInput = z.infer<typeof UpdateResourceSchema>;

