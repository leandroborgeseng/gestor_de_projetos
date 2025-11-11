import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../../db/prisma.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../auth/jwt.js";
import { handleError } from "../../utils/errors.js";
import { CompanyPlan, CompanyUserRole } from "@prisma/client";

const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

async function ensureDefaultCompany() {
  return prisma.company.upsert({
    where: { slug: "empresa-padrao" },
    update: {},
    create: {
      id: "company_default",
      name: "Empresa Padrão",
      slug: "empresa-padrao",
      plan: CompanyPlan.PRO,
      maxUsers: 100,
      maxProjects: 200,
    },
  });
}

async function upsertMembership(userId: string, companyId: string, role: CompanyUserRole) {
  await prisma.companyUser.upsert({
    where: {
      companyId_userId: {
        companyId,
        userId,
      },
    },
    update: {
      role,
    },
    create: {
      companyId,
      userId,
      role,
    },
  });
}

async function buildCompanyContext(userId: string) {
  const memberships = await prisma.companyUser.findMany({
     where: { userId },
     include: {
       company: {
         select: {
           id: true,
           name: true,
           slug: true,
           plan: true,
           isActive: true,
           maxUsers: true,
           maxProjects: true,
           maxStorageMb: true,
           primaryColor: true,
           secondaryColor: true,
           accentColor: true,
           backgroundColor: true,
           logoUrl: true,
         },
       },
     },
     orderBy: { createdAt: "asc" },
   });
 
   const companies = memberships.map((membership) => ({
     id: membership.company.id,
     name: membership.company.name,
     slug: membership.company.slug,
     plan: membership.company.plan,
     isActive: membership.company.isActive,
     maxUsers: membership.company.maxUsers,
     maxProjects: membership.company.maxProjects,
     maxStorageMb: membership.company.maxStorageMb,
     role: membership.role,
     primaryColor: membership.company.primaryColor,
     secondaryColor: membership.company.secondaryColor,
     accentColor: membership.company.accentColor,
     backgroundColor: membership.company.backgroundColor,
     logoUrl: membership.company.logoUrl,
   }));

  const tokenCompanies = memberships.map((membership) => ({
    companyId: membership.companyId,
    role: membership.role,
  }));

  const activeCompanyId = companies.find((company) => company.isActive)?.id || tokenCompanies[0]?.companyId;

  return { companies, tokenCompanies, activeCompanyId };
}

export async function register(req: Request, res: Response) {
  try {
    const parse = RegisterSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { name, email, password } = parse.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    const defaultCompany = await ensureDefaultCompany();
    await upsertMembership(user.id, defaultCompany.id, CompanyUserRole.OWNER);

    const { companies, tokenCompanies, activeCompanyId } = await buildCompanyContext(user.id);

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companies: tokenCompanies,
      activeCompanyId,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      companies,
      activeCompanyId,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function login(req: Request, res: Response) {
  try {
    const parse = LoginSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { email, password } = parse.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { companies, tokenCompanies, activeCompanyId } = await buildCompanyContext(user.id);

    if (tokenCompanies.length === 0) {
      const defaultCompany = await ensureDefaultCompany();
      await upsertMembership(user.id, defaultCompany.id, CompanyUserRole.MEMBER);
      const refreshed = await buildCompanyContext(user.id);
      companies.splice(0, companies.length, ...refreshed.companies);
      tokenCompanies.splice(0, tokenCompanies.length, ...refreshed.tokenCompanies);
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companies: tokenCompanies,
      activeCompanyId: activeCompanyId || tokenCompanies[0]?.companyId,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      companies,
      activeCompanyId: payload.activeCompanyId,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const { tokenCompanies, activeCompanyId } = await buildCompanyContext(user.id);

    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companies: tokenCompanies,
      activeCompanyId,
    };

    const newAccessToken = generateAccessToken(newPayload);

    res.json({ accessToken: newAccessToken, activeCompanyId, companies: tokenCompanies });
  } catch (error) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
}

