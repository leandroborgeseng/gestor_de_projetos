import { z } from "zod";

const ResourceSkillSchema = z.object({
  skillId: z.string().min(1),
  score: z.number().min(0).max(10),
});

export const CreateResourceSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  unitCost: z.number().nonnegative(),
  unit: z.string().min(1),
  notes: z.string().optional(),
  availableHours: z.number().nonnegative().optional(),
  resourceSkills: z.array(ResourceSkillSchema).optional(),
});

export const UpdateResourceSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  unitCost: z.number().nonnegative().optional(),
  unit: z.string().min(1).optional(),
  notes: z.string().optional(),
  availableHours: z.number().nonnegative().optional(),
  resourceSkills: z.array(ResourceSkillSchema).optional(),
});

export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;
export type UpdateResourceInput = z.infer<typeof UpdateResourceSchema>;

