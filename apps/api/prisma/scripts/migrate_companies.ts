#!/usr/bin/env ts-node
import { readFileSync } from "fs";
import path from "path";
import process from "process";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../src/db/prisma.js";

const DEFAULT_BRANDING = {
  primaryColor: "#4F46E5",
  secondaryColor: "#4338CA",
  accentColor: "#F97316",
  backgroundColor: "#111827",
};

interface CompanyUserAssignment {
  userId: string;
  role?: Prisma.CompanyUserRole;
  makeActive?: boolean;
}

interface CompanyMigrationConfig {
  id?: string;
  name: string;
  slug: string;
  plan?: Prisma.CompanyPlan;
  isActive?: boolean;
  maxUsers?: number | null;
  maxProjects?: number | null;
  maxStorageMb?: number | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  projectIds?: string[];
  resourceIds?: string[];
  skillIds?: string[];
  templateIds?: string[];
  savedFilterIds?: string[];
  webhookIds?: string[];
  users?: CompanyUserAssignment[];
  detachFromDefault?: boolean;
}

interface MigrationConfigFile {
  companies: CompanyMigrationConfig[];
}

function loadConfig(): MigrationConfigFile {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Uso: pnpm ts-node migrate_companies.ts <arquivo-config.json>");
    process.exit(1);
  }

  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const raw = readFileSync(absolute, "utf-8");
  const parsed = JSON.parse(raw);

  if (!parsed || !Array.isArray(parsed.companies)) {
    throw new Error("Arquivo de configuração inválido: campo 'companies' é obrigatório e deve ser um array.");
  }

  return parsed as MigrationConfigFile;
}

async function upsertCompany(config: CompanyMigrationConfig) {
  const companyId = config.id ?? randomUUID();

  const existing = await prisma.company.findFirst({
    where: {
      OR: [{ id: companyId }, { slug: config.slug }],
    },
  });

  const data = {
    id: existing?.id ?? companyId,
    name: config.name,
    slug: config.slug,
    plan: config.plan ?? Prisma.CompanyPlan.FREE,
    isActive: config.isActive ?? true,
    maxUsers: config.maxUsers ?? existing?.maxUsers ?? null,
    maxProjects: config.maxProjects ?? existing?.maxProjects ?? null,
    maxStorageMb: config.maxStorageMb ?? existing?.maxStorageMb ?? null,
    primaryColor: config.primaryColor ?? existing?.primaryColor ?? DEFAULT_BRANDING.primaryColor,
    secondaryColor: config.secondaryColor ?? existing?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
    accentColor: config.accentColor ?? existing?.accentColor ?? DEFAULT_BRANDING.accentColor,
    backgroundColor: config.backgroundColor ?? existing?.backgroundColor ?? DEFAULT_BRANDING.backgroundColor,
  } satisfies Partial<CompanyMigrationConfig> & { id: string };

  const company = await prisma.company.upsert({
    where: existing ? { id: existing.id } : { id: data.id },
    update: {
      name: data.name,
      slug: data.slug,
      plan: data.plan,
      isActive: data.isActive,
      maxUsers: data.maxUsers,
      maxProjects: data.maxProjects,
      maxStorageMb: data.maxStorageMb,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      backgroundColor: data.backgroundColor,
    },
    create: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      plan: data.plan,
      isActive: data.isActive,
      maxUsers: data.maxUsers,
      maxProjects: data.maxProjects,
      maxStorageMb: data.maxStorageMb,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      backgroundColor: data.backgroundColor,
    },
  });

  return company.id;
}

async function reassignProjects(companyId: string, projectIds?: string[]) {
  if (!projectIds?.length) return;

  await prisma.project.updateMany({
    where: { id: { in: projectIds } },
    data: { companyId },
  });

  await prisma.tag.updateMany({
    where: { projectId: { in: projectIds } },
    data: { companyId },
  });

  await prisma.webhook.updateMany({
    where: { projectId: { in: projectIds } },
    data: { companyId },
  });
}

async function reassignResources(companyId: string, resourceIds?: string[]) {
  if (!resourceIds?.length) return;

  await prisma.resource.updateMany({
    where: { id: { in: resourceIds } },
    data: { companyId },
  });
}

async function reassignSkills(companyId: string, skillIds?: string[]) {
  if (!skillIds?.length) return;

  await prisma.skill.updateMany({
    where: { id: { in: skillIds } },
    data: { companyId },
  });
}

async function reassignTemplates(companyId: string, templateIds?: string[]) {
  if (!templateIds?.length) return;

  await prisma.projectTemplate.updateMany({
    where: { id: { in: templateIds } },
    data: { companyId },
  });
}

async function reassignSavedFilters(companyId: string, savedFilterIds?: string[]) {
  if (!savedFilterIds?.length) return;

  await prisma.savedFilter.updateMany({
    where: { id: { in: savedFilterIds } },
    data: { companyId },
  });
}

async function reassignWebhooks(companyId: string, webhookIds?: string[]) {
  if (!webhookIds?.length) return;

  await prisma.webhook.updateMany({
    where: { id: { in: webhookIds } },
    data: { companyId },
  });
}

async function assignUsers(companyId: string, assignments?: CompanyUserAssignment[]) {
  if (!assignments?.length) return;

  for (const assignment of assignments) {
    await prisma.companyUser.upsert({
      where: {
        companyId_userId: {
          companyId,
          userId: assignment.userId,
        },
      },
      update: {
        role: assignment.role ?? Prisma.CompanyUserRole.MEMBER,
      },
      create: {
        id: randomUUID(),
        companyId,
        userId: assignment.userId,
        role: assignment.role ?? Prisma.CompanyUserRole.MEMBER,
      },
    });
  }
}

async function detachFromDefault(companyId: string, entries: CompanyMigrationConfig) {
  if (!entries.detachFromDefault) return;

  const defaultId = "company_default";
  if (companyId === defaultId) return;

  const projectIds = entries.projectIds ?? [];
  if (projectIds.length > 0) {
    await prisma.companyUser.deleteMany({
      where: {
        companyId: defaultId,
        userId: {
          in: await prisma.projectMember
            .findMany({
              where: { projectId: { in: projectIds } },
              select: { userId: true },
              distinct: ["userId"],
            })
            .then((members) => members.map((m) => m.userId)),
        },
      },
    });
  }
}

async function main() {
  const config = loadConfig();

  console.log(`Encontrado ${config.companies.length} bloco(s) de migração.`);

  for (const entry of config.companies) {
    console.log(`\n→ Processando empresa ${entry.name} (${entry.slug})...`);
    const companyId = await upsertCompany(entry);
    console.log(`   • ID final: ${companyId}`);

    await reassignProjects(companyId, entry.projectIds);
    await reassignResources(companyId, entry.resourceIds);
    await reassignSkills(companyId, entry.skillIds);
    await reassignTemplates(companyId, entry.templateIds);
    await reassignSavedFilters(companyId, entry.savedFilterIds);
    await reassignWebhooks(companyId, entry.webhookIds);
    await assignUsers(companyId, entry.users);
    await detachFromDefault(companyId, entry);

    console.log("   • Migração concluída para esta empresa.");
  }

  console.log("\nMigração finalizada.");
}

main()
  .catch((error) => {
    console.error("Erro durante migração:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
