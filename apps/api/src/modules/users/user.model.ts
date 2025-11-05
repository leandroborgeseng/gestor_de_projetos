import { z } from "zod";

// Regex para validar CEP (8 dígitos)
const cepRegex = /^\d{5}-?\d{3}$/;
// Regex para validar telefone (aceita vários formatos com DDD)
const phoneRegex = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;

export const CreateUserSchema = z.object({
  name: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
  position: z.string().optional(), // Cargo
  cep: z.string().regex(cepRegex, "CEP inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().regex(phoneRegex, "Telefone inválido. Use o formato (XX) XXXX-XXXX").optional().or(z.literal("")),
  cellphone: z.string().regex(phoneRegex, "Celular inválido. Use o formato (XX) XXXXX-XXXX").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).optional(),
  hourlyRate: z.number().nonnegative().optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  position: z.string().optional(),
  cep: z.string().regex(cepRegex, "CEP inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().regex(phoneRegex, "Telefone inválido. Use o formato (XX) XXXX-XXXX").optional().or(z.literal("")),
  cellphone: z.string().regex(phoneRegex, "Celular inválido. Use o formato (XX) XXXXX-XXXX").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).optional(),
  hourlyRate: z.number().nonnegative().optional(),
});

export const ResetPasswordSchema = z.object({
  userId: z.string().cuid(),
  newPassword: z.string().min(6),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

