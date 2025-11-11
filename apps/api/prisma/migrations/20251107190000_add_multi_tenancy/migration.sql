-- Create enums
CREATE TYPE "CompanyPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE "CompanyUserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- Create companies table
CREATE TABLE "Company" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "CompanyPlan" NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "maxUsers" INTEGER,
    "maxProjects" INTEGER,
    "maxStorageMb" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Company_slug_key" ON "Company" ("slug");
CREATE INDEX "Company_isActive_idx" ON "Company" ("isActive");

-- Seed default company to migrate existing data
INSERT INTO "Company" ("id", "name", "slug", "plan", "isActive")
VALUES ('company_default', 'Empresa Padrão', 'empresa-padrao', 'FREE', TRUE)
ON CONFLICT ("id") DO NOTHING;

-- Add companyId to Project
ALTER TABLE "Project"
    ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'company_default';

ALTER TABLE "Project"
    ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Project_companyId_idx" ON "Project" ("companyId");

ALTER TABLE "Project"
    ALTER COLUMN "companyId" DROP DEFAULT;

-- Add companyId to Skill
ALTER TABLE "Skill"
    ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'company_default';

ALTER TABLE "Skill"
    ADD CONSTRAINT "Skill_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Skill_companyId_idx" ON "Skill" ("companyId");

-- Enforce uniqueness of (companyId, name)
CREATE UNIQUE INDEX "Skill_companyId_name_key" ON "Skill" ("companyId", "name");

ALTER TABLE "Skill"
    ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE "Skill"
    DROP CONSTRAINT IF EXISTS "Skill_name_key";

-- Add companyId to Resource
ALTER TABLE "Resource"
    ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'company_default';

ALTER TABLE "Resource"
    ADD CONSTRAINT "Resource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Resource_companyId_idx" ON "Resource" ("companyId");

ALTER TABLE "Resource"
    ALTER COLUMN "companyId" DROP DEFAULT;

-- Add companyId to Tag
ALTER TABLE "Tag"
    ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'company_default';

ALTER TABLE "Tag"
    ADD CONSTRAINT "Tag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Tag_companyId_idx" ON "Tag" ("companyId");

ALTER TABLE "Tag"
    ALTER COLUMN "companyId" DROP DEFAULT;

-- Add companyId to SavedFilter
ALTER TABLE "SavedFilter"
    ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'company_default';

ALTER TABLE "SavedFilter"
    ADD CONSTRAINT "SavedFilter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "SavedFilter_companyId_idx" ON "SavedFilter" ("companyId");

ALTER TABLE "SavedFilter"
    ALTER COLUMN "companyId" DROP DEFAULT;

-- Add companyId to Webhook
ALTER TABLE "Webhook"
    ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'company_default';

ALTER TABLE "Webhook"
    ADD CONSTRAINT "Webhook_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Webhook_companyId_idx" ON "Webhook" ("companyId");

ALTER TABLE "Webhook"
    ALTER COLUMN "companyId" DROP DEFAULT;

-- Add companyId to ProjectTemplate (optional)
ALTER TABLE "ProjectTemplate"
    ADD COLUMN "companyId" TEXT;

ALTER TABLE "ProjectTemplate"
    ADD CONSTRAINT "ProjectTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ProjectTemplate_companyId_idx" ON "ProjectTemplate" ("companyId");

-- Create CompanyUser table
CREATE TABLE "CompanyUser" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CompanyUserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompanyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CompanyUser_companyId_userId_key" ON "CompanyUser" ("companyId", "userId");
CREATE INDEX "CompanyUser_userId_idx" ON "CompanyUser" ("userId");
CREATE INDEX "CompanyUser_companyId_idx" ON "CompanyUser" ("companyId");

-- Associate existing users with default company
INSERT INTO "CompanyUser" ("id", "companyId", "userId", "role")
SELECT 'company_default_' || "id", 'company_default', "id",
       (CASE WHEN "role" = 'ADMIN' THEN 'OWNER' ELSE 'MEMBER' END)::"CompanyUserRole"
FROM "User"
ON CONFLICT ("companyId", "userId") DO NOTHING;

-- Ensure existing saved filters are linked to default company
UPDATE "SavedFilter" SET "companyId" = 'company_default' WHERE "companyId" IS NULL;

-- Ensure existing tags inherit project company when possible
UPDATE "Tag" SET "companyId" = p."companyId"
FROM "Project" p
WHERE "Tag"."projectId" = p."id";

-- Ensure resources/skills tie to default company
UPDATE "Resource" SET "companyId" = 'company_default' WHERE "companyId" IS NULL;
UPDATE "Skill" SET "companyId" = 'company_default' WHERE "companyId" IS NULL;
UPDATE "Webhook" SET "companyId" = COALESCE(p."companyId", 'company_default')
FROM "Project" p
WHERE "Webhook"."projectId" = p."id";

-- Refresh updatedAt on Company records after migrations
UPDATE "Company" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 'company_default';
