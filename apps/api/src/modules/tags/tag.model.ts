import { z } from "zod";

export const CreateTagSchema = z.object({
  name: z.string().min(1, "Nome da tag é obrigatório"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor deve estar no formato hexadecimal (#RRGGBB)").optional(),
  projectId: z.string().optional(),
});

export const UpdateTagSchema = z.object({
  name: z.string().min(1, "Nome da tag é obrigatório").optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor deve estar no formato hexadecimal (#RRGGBB)").optional(),
});

export const AddTagToTaskSchema = z.object({
  tagId: z.string().min(1, "ID da tag é obrigatório"),
});

export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;
export type AddTagToTaskInput = z.infer<typeof AddTagToTaskSchema>;

