import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import {
  CreateCompanySchema,
  UpdateCompanySchema,
  AddCompanyUserSchema,
  UpdateCompanyUserSchema,
} from "./company.model.js";
import { handleError } from "../../utils/errors.js";
import { CompanyPlan, CompanyUserRole } from "@prisma/client";
import { logDelete } from "../../services/activityLogger.js";
import { deleteFile as deleteFileFromDisk, getFileUrl } from "../../config/upload.js";

const DEFAULT_BRANDING = {
  dark: {
    primary: "#4F46E5",
    secondary: "#4338CA",
    accent: "#F97316",
    background: "#111827",
  },
  light: {
    primary: "#4338CA",
    secondary: "#6366F1",
    accent: "#F97316",
    background: "#F8FAFC",
  },
};

function normalizeColor(color?: string) {
  if (!color) return undefined;
  const trimmed = color.trim();
  return trimmed ? trimmed.toUpperCase() : undefined;
}

function userIsSuperAdmin(req: Request) {
  return req.user?.role === "SUPERADMIN";
}

async function ensureCompanyMembership(companyId: string, userId: string) {
  return prisma.companyUser.findUnique({
    where: {
      companyId_userId: {
        companyId,
        userId,
      },
    },
  });
}

function canManageCompany(companyRole?: CompanyUserRole | string, globalRole?: string) {
  if (globalRole === "SUPERADMIN") return true;
  return companyRole === "OWNER" || companyRole === "ADMIN";
}

export async function listCompanies(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

  const globalAdmin = userIsSuperAdmin(req);

    const companies = await prisma.company.findMany({
      where: globalAdmin
        ? {}
        : {
            users: {
              some: {
                userId,
              },
            },
          },
      include: {
        users: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: {
            projects: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const mapped = companies.map((company) => {
      const membership = company.users.find((member) => member.userId === userId);
      return {
        ...company,
        role: membership?.role ?? (globalAdmin ? "SUPERADMIN" : undefined),
      };
    });

    res.json(mapped);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getCompany(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        users: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        _count: {
          select: {
            projects: true,
            users: true,
          },
        },
      },
    });

    if (!company) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    if (!userIsSuperAdmin(req)) {
      const membership = await ensureCompanyMembership(company.id, userId);
      if (!membership) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const membership = company.users.find((member) => member.userId === userId);

    res.json({
      ...company,
      role: membership?.role ?? (userIsSuperAdmin(req) ? "SUPERADMIN" : undefined),
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function createCompany(req: Request, res: Response) {
  try {
    if (!userIsSuperAdmin(req)) {
      return res.status(403).json({ error: "Apenas super administradores podem criar empresas" });
    }

    const parse = CreateCompanySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const data = parse.data;

    const owner = await prisma.user.findUnique({
      where: { id: data.ownerUserId },
      select: { id: true },
    });

    if (!owner) {
      return res.status(404).json({ error: "Usuário proprietário não encontrado" });
    }

    const primaryColor = normalizeColor(data.primaryColor) ?? DEFAULT_BRANDING.dark.primary;
    const secondaryColor = normalizeColor(data.secondaryColor) ?? DEFAULT_BRANDING.dark.secondary;
    const accentColor = normalizeColor(data.accentColor) ?? DEFAULT_BRANDING.dark.accent;
    const backgroundColor = normalizeColor(data.backgroundColor) ?? DEFAULT_BRANDING.dark.background;

    const lightPrimaryColor =
      normalizeColor(data.lightPrimaryColor) ?? normalizeColor(data.primaryColor) ?? DEFAULT_BRANDING.light.primary;
    const lightSecondaryColor =
      normalizeColor(data.lightSecondaryColor) ??
      normalizeColor(data.secondaryColor) ??
      DEFAULT_BRANDING.light.secondary;
    const lightAccentColor =
      normalizeColor(data.lightAccentColor) ?? normalizeColor(data.accentColor) ?? DEFAULT_BRANDING.light.accent;
    const lightBackgroundColor =
      normalizeColor(data.lightBackgroundColor) ?? DEFAULT_BRANDING.light.background;

    const company = await prisma.company.create({
      data: {
        name: data.name,
        slug: data.slug,
        plan: (data.plan || "FREE") as CompanyPlan,
        maxUsers: data.maxUsers,
        maxProjects: data.maxProjects,
        maxStorageMb: data.maxStorageMb,
        primaryColor,
        secondaryColor,
        accentColor,
        backgroundColor,
        lightPrimaryColor,
        lightSecondaryColor,
        lightAccentColor,
        lightBackgroundColor,
        users: {
          create: {
            userId: data.ownerUserId,
            role: CompanyUserRole.OWNER,
          },
        },
      },
      include: {
        users: true,
      },
    });

    res.status(201).json(company);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Já existe uma empresa com este slug" });
    }
    handleError(error, res);
  }
}

export async function updateCompany(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parse = UpdateCompanySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const company = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!company) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const membership = userIsSuperAdmin(req)
      ? null
      : await ensureCompanyMembership(company.id, userId);
    const canManage = canManageCompany(membership?.role, req.user?.role);

    if (!canManage) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const data = parse.data;
    const updated = await prisma.company.update({
      where: { id: company.id },
      data: {
        ...data,
        plan: data.plan ? (data.plan as CompanyPlan) : undefined,
        primaryColor: data.primaryColor !== undefined ? normalizeColor(data.primaryColor) : undefined,
        secondaryColor: data.secondaryColor !== undefined ? normalizeColor(data.secondaryColor) : undefined,
        accentColor: data.accentColor !== undefined ? normalizeColor(data.accentColor) : undefined,
        backgroundColor: data.backgroundColor !== undefined ? normalizeColor(data.backgroundColor) : undefined,
        lightPrimaryColor:
          data.lightPrimaryColor !== undefined ? normalizeColor(data.lightPrimaryColor) : undefined,
        lightSecondaryColor:
          data.lightSecondaryColor !== undefined ? normalizeColor(data.lightSecondaryColor) : undefined,
        lightAccentColor:
          data.lightAccentColor !== undefined ? normalizeColor(data.lightAccentColor) : undefined,
        lightBackgroundColor:
          data.lightBackgroundColor !== undefined ? normalizeColor(data.lightBackgroundColor) : undefined,
      },
      include: {
        users: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { projects: true, users: true },
        },
      },
    });

    console.log(`[companies] Empresa atualizada`, {
      companyId: company.id,
      userId,
      payload: data,
    });

    res.json(updated);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Já existe uma empresa com este slug" });
    }
    console.error("[companies] Falha ao atualizar empresa", error);
    handleError(error, res);
  }
}

async function collectCompanyAttachmentFiles(companyId: string) {
  const attachments = await prisma.fileAttachment.findMany({
    where: {
      task: {
        project: {
          companyId,
        },
      },
    },
    select: { fileName: true },
  });

  return attachments.map((a) => a.fileName);
}

export async function deleteCompany(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const company = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!company) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const membership = userIsSuperAdmin(req)
      ? await ensureCompanyMembership(company.id, userId).catch(() => null)
      : await ensureCompanyMembership(company.id, userId);
    const canManage = canManageCompany(membership?.role, req.user?.role);

    if (!canManage) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const fileNames = await collectCompanyAttachmentFiles(company.id);

    await prisma.$transaction(async (tx) => {
      await tx.companyUser.deleteMany({ where: { companyId: company.id } });
      await tx.company.delete({ where: { id: company.id } });
    });

    if (company.logoKey) {
      deleteFileFromDisk(company.logoKey);
    }
    if (company.lightLogoKey) {
      deleteFileFromDisk(company.lightLogoKey);
    }

    fileNames.forEach((fileName) => {
      if (fileName) {
        deleteFileFromDisk(fileName);
      }
    });

    if (userId) {
      logDelete(userId, company.id, "Company", company.id, {
        name: company.name,
        plan: company.plan,
      }).catch(console.error);
    }

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

export async function addCompanyUser(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parse = AddCompanyUserSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const companyId = req.params.id;
    const membership = userIsSuperAdmin(req)
      ? await ensureCompanyMembership(companyId, userId).catch(() => null)
      : await ensureCompanyMembership(companyId, userId);
    const canManage = canManageCompany(membership?.role, req.user?.role);

    if (!canManage) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const userExists = await prisma.user.findUnique({
      where: { id: parse.data.userId },
      select: { id: true },
    });

    if (!userExists) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const companyUser = await prisma.companyUser.upsert({
      where: {
        companyId_userId: {
          companyId,
          userId: parse.data.userId,
        },
      },
      update: {
        role: parse.data.role as CompanyUserRole,
      },
      create: {
        companyId,
        userId: parse.data.userId,
        role: parse.data.role as CompanyUserRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json(companyUser);
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateCompanyUser(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parse = UpdateCompanyUserSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const companyId = req.params.id;

    const membership = await ensureCompanyMembership(companyId, userId);
    const canManage = canManageCompany(membership?.role, req.user?.role);

    if (!canManage) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const targetMembership = await ensureCompanyMembership(companyId, req.params.userId);
    if (!targetMembership) {
      return res.status(404).json({ error: "Usuário não pertence à empresa" });
    }

    if (targetMembership.role === CompanyUserRole.OWNER && parse.data.role !== CompanyUserRole.OWNER) {
      const owners = await prisma.companyUser.count({
        where: { companyId, role: CompanyUserRole.OWNER },
      });
      if (owners <= 1) {
        return res.status(400).json({ error: "A empresa deve ter pelo menos um proprietário" });
      }
    }

    const updated = await prisma.companyUser.update({
      where: { companyId_userId: { companyId, userId: req.params.userId } },
      data: { role: parse.data.role as CompanyUserRole },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    handleError(error, res);
  }
}

export async function removeCompanyUser(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const companyId = req.params.id;
    const targetUserId = req.params.userId;

    const membership = await ensureCompanyMembership(companyId, userId);
    const canManage = canManageCompany(membership?.role, req.user?.role);

    if (!canManage) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (targetUserId === userId && !userIsSuperAdmin(req)) {
      const owners = await prisma.companyUser.count({ where: { companyId, role: CompanyUserRole.OWNER } });
      if (owners <= 1) {
        return res.status(400).json({ error: "A empresa deve ter pelo menos um proprietário" });
      }
    }

    const targetMembership = await ensureCompanyMembership(companyId, targetUserId);
    if (!targetMembership) {
      return res.status(404).json({ error: "Usuário não pertence à empresa" });
    }

    if (targetMembership.role === CompanyUserRole.OWNER) {
      const owners = await prisma.companyUser.count({ where: { companyId, role: CompanyUserRole.OWNER } });
      if (owners <= 1) {
        return res.status(400).json({ error: "A empresa deve ter pelo menos um proprietário" });
      }
    }

    await prisma.companyUser.delete({
      where: { companyId_userId: { companyId, userId: targetUserId } },
    });

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

export async function uploadCompanyLogo(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const company = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!company) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const membership = userIsSuperAdmin(req)
      ? await ensureCompanyMembership(company.id, userId).catch(() => null)
      : await ensureCompanyMembership(company.id, userId);
    const canManage = canManageCompany(membership?.role, req.user?.role);

    if (!canManage) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Arquivo de logo é obrigatório" });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      deleteFileFromDisk(req.file.filename);
      return res.status(400).json({ error: "Apenas arquivos de imagem são permitidos para o logo" });
    }

    const themeParam = (req.query.theme as string | undefined)?.toLowerCase();
    const theme: "light" | "dark" = themeParam === "light" ? "light" : "dark";

    const existingKey = theme === "light" ? company.lightLogoKey : company.logoKey;
    if (existingKey) {
      deleteFileFromDisk(existingKey);
    }

    const logoUrl = getFileUrl(req.file.filename);

    const updated = await prisma.company.update({
      where: { id: company.id },
      data: {
        ...(theme === "dark"
          ? { logoKey: req.file.filename, logoUrl }
          : { lightLogoKey: req.file.filename, lightLogoUrl: logoUrl }),
      },
    });

    res.json({
      logoUrl: updated.logoUrl,
      lightLogoUrl: updated.lightLogoUrl,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteCompanyLogo(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const company = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!company) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const membership = userIsSuperAdmin(req)
      ? await ensureCompanyMembership(company.id, userId).catch(() => null)
      : await ensureCompanyMembership(company.id, userId);
    const canManage = canManageCompany(membership?.role, req.user?.role);

    if (!canManage) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const themeParam = (req.query.theme as string | undefined)?.toLowerCase();
    const theme: "light" | "dark" = themeParam === "light" ? "light" : "dark";

    const logoKey = theme === "light" ? company.lightLogoKey : company.logoKey;
    if (logoKey) {
      deleteFileFromDisk(logoKey);
    }

    await prisma.company.update({
      where: { id: company.id },
      data: {
        ...(theme === "dark"
          ? { logoKey: null, logoUrl: null }
          : { lightLogoKey: null, lightLogoUrl: null }),
      },
    });

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}
