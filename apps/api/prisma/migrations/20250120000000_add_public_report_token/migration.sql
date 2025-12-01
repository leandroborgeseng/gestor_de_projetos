-- AlterTable
ALTER TABLE "Project" ADD COLUMN "publicReportToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_publicReportToken_key" ON "Project"("publicReportToken");

-- CreateIndex
CREATE INDEX "Project_publicReportToken_idx" ON "Project"("publicReportToken");

