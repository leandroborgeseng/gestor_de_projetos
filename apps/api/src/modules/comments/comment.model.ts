import { z } from "zod";

export const CreateCommentSchema = z.object({
  content: z.string().min(1, "Comentário não pode estar vazio"),
  parentId: z.string().optional(),
});

export const UpdateCommentSchema = z.object({
  content: z.string().min(1, "Comentário não pode estar vazio"),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;

