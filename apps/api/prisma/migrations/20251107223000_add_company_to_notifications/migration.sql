ALTER TABLE "Notification"
ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'company_default';

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Notification_companyId_idx" ON "Notification" ("companyId");

ALTER TABLE "Notification"
ALTER COLUMN "companyId" DROP DEFAULT;
