import { z } from "zod";

const hexColorRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const optionalHexColor = z
  .string()
  .regex(hexColorRegex, "Cor inválida. Use formato hexadecimal, ex: #1f2937")
  .optional();

export const CreateCompanySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  plan: z.enum(["FREE", "PRO", "ENTERPRISE"]).optional().default("FREE"),
  maxUsers: z.number().int().positive().optional(),
  maxProjects: z.number().int().positive().optional(),
  maxStorageMb: z.number().int().positive().optional(),
  ownerUserId: z.string().cuid(),
  primaryColor: optionalHexColor,
  secondaryColor: optionalHexColor,
  accentColor: optionalHexColor,
  backgroundColor: optionalHexColor,
  lightPrimaryColor: optionalHexColor,
  lightSecondaryColor: optionalHexColor,
  lightAccentColor: optionalHexColor,
  lightBackgroundColor: optionalHexColor,
});

export const UpdateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens")
    .optional(),
  plan: z.enum(["FREE", "PRO", "ENTERPRISE"]).optional(),
  maxUsers: z.number().int().positive().nullable().optional(),
  maxProjects: z.number().int().positive().nullable().optional(),
  maxStorageMb: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  primaryColor: optionalHexColor,
  secondaryColor: optionalHexColor,
  accentColor: optionalHexColor,
  backgroundColor: optionalHexColor,
  lightPrimaryColor: optionalHexColor,
  lightSecondaryColor: optionalHexColor,
  lightAccentColor: optionalHexColor,
  lightBackgroundColor: optionalHexColor,
});

export const AddCompanyUserSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER"),
});

export const UpdateCompanyUserSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});
