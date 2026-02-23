-- DropIndex
DROP INDEX "AuditLog_envId_idx";

-- DropIndex
DROP INDEX "AuditLog_flagId_idx";

-- DropIndex
DROP INDEX "AuditLog_projectId_idx";

-- AlterTable
ALTER TABLE "FlagConfig" ALTER COLUMN "allowList" DROP DEFAULT,
ALTER COLUMN "denyList" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "AuditLog_projectId_createdAt_idx" ON "AuditLog"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_flagId_createdAt_idx" ON "AuditLog"("flagId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_envId_createdAt_idx" ON "AuditLog"("envId", "createdAt" DESC);
