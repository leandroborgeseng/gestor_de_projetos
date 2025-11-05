import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { handleError } from "../../utils/errors.js";
import {
  UpdateSettingsSchema,
  BulkUpdatePermissionsSchema,
} from "./settings.model.js";

// Obter todas as configurações
export async function getSettings(req: Request, res: Response) {
  try {
    const settings = await prisma.settings.findMany();
    const permissions = await prisma.permission.findMany();

    // Converter para objeto chave-valor
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    // Agrupar permissões por role
    const permissionsByRole = permissions.reduce((acc, perm) => {
      if (!acc[perm.role]) {
        acc[perm.role] = [];
      }
      acc[perm.role].push({
        resource: perm.resource,
        action: perm.action,
        allowed: perm.allowed,
      });
      return acc;
    }, {} as Record<string, Array<{ resource: string; action: string; allowed: boolean }>>);

    res.json({
      settings: {
        emailHost: settingsObj.emailHost || "",
        emailPort: settingsObj.emailPort ? parseInt(settingsObj.emailPort) : 587,
        emailUser: settingsObj.emailUser || "",
        emailPassword: settingsObj.emailPassword || "",
        emailFrom: settingsObj.emailFrom || "",
        emailFromName: settingsObj.emailFromName || "",
        maxFileSize: settingsObj.maxFileSize ? parseInt(settingsObj.maxFileSize) : 10, // MB
        allowedFileTypes: settingsObj.allowedFileTypes
          ? JSON.parse(settingsObj.allowedFileTypes)
          : ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "jpg", "jpeg", "png"],
      },
      permissions: permissionsByRole,
    });
  } catch (error) {
    handleError(error, res);
  }
}

// Atualizar configurações
export async function updateSettings(req: Request, res: Response) {
  try {
    const parse = UpdateSettingsSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const data = parse.data;

    // Atualizar ou criar cada configuração
    const updates = [];
    if (data.emailHost !== undefined) {
      updates.push(
        prisma.settings.upsert({
          where: { key: "emailHost" },
          update: { value: data.emailHost },
          create: { key: "emailHost", value: data.emailHost },
        })
      );
    }
    if (data.emailPort !== undefined) {
      updates.push(
        prisma.settings.upsert({
          where: { key: "emailPort" },
          update: { value: data.emailPort.toString() },
          create: { key: "emailPort", value: data.emailPort.toString() },
        })
      );
    }
    if (data.emailUser !== undefined) {
      updates.push(
        prisma.settings.upsert({
          where: { key: "emailUser" },
          update: { value: data.emailUser },
          create: { key: "emailUser", value: data.emailUser },
        })
      );
    }
    if (data.emailPassword !== undefined) {
      updates.push(
        prisma.settings.upsert({
          where: { key: "emailPassword" },
          update: { value: data.emailPassword },
          create: { key: "emailPassword", value: data.emailPassword },
        })
      );
    }
    if (data.emailFrom !== undefined) {
      updates.push(
        prisma.settings.upsert({
          where: { key: "emailFrom" },
          update: { value: data.emailFrom },
          create: { key: "emailFrom", value: data.emailFrom },
        })
      );
    }
    if (data.emailFromName !== undefined) {
      updates.push(
        prisma.settings.upsert({
          where: { key: "emailFromName" },
          update: { value: data.emailFromName },
          create: { key: "emailFromName", value: data.emailFromName },
        })
      );
    }
    if (data.maxFileSize !== undefined) {
      updates.push(
        prisma.settings.upsert({
          where: { key: "maxFileSize" },
          update: { value: data.maxFileSize.toString() },
          create: { key: "maxFileSize", value: data.maxFileSize.toString() },
        })
      );
    }
    if (data.allowedFileTypes !== undefined) {
      updates.push(
        prisma.settings.upsert({
          where: { key: "allowedFileTypes" },
          update: { value: JSON.stringify(data.allowedFileTypes) },
          create: { key: "allowedFileTypes", value: JSON.stringify(data.allowedFileTypes) },
        })
      );
    }

    await Promise.all(updates);

    res.json({ message: "Configurações atualizadas com sucesso" });
  } catch (error) {
    handleError(error, res);
  }
}

// Atualizar permissões em lote
export async function updatePermissions(req: Request, res: Response) {
  try {
    const parse = BulkUpdatePermissionsSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { permissions } = parse.data;

    // Para cada permissão, fazer upsert
    for (const perm of permissions) {
      await prisma.permission.upsert({
        where: {
          role_resource_action: {
            role: perm.role as any,
            resource: perm.resource,
            action: perm.action,
          },
        },
        update: {
          allowed: perm.allowed,
        },
        create: {
          role: perm.role as any,
          resource: perm.resource,
          action: perm.action,
          allowed: perm.allowed,
        },
      });
    }

    res.json({ message: "Permissões atualizadas com sucesso" });
  } catch (error) {
    handleError(error, res);
  }
}

