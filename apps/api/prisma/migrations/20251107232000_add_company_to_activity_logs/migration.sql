ALTER TABLE "ActivityLog"
ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'company_default';

ALTER TABLE "ActivityLog"
ADD CONSTRAINT "ActivityLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ActivityLog_companyId_idx" ON "ActivityLog" ("companyId");

ALTER TABLE "ActivityLog"
ALTER COLUMN "companyId" DROP DEFAULT;
