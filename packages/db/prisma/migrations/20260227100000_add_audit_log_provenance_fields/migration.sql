-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "actorRole" TEXT,
ADD COLUMN "actorType" TEXT,
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "isSystemAction" BOOLEAN,
ADD COLUMN "requestId" TEXT,
ADD COLUMN "sessionId" TEXT,
ADD COLUMN "tokenId" TEXT,
ADD COLUMN "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_idx" ON "AuditLog"("actorType");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");
