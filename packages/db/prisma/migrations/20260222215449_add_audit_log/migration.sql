-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityKey" TEXT,
    "projectId" TEXT,
    "projectKey" TEXT,
    "envId" TEXT,
    "envKey" TEXT,
    "flagId" TEXT,
    "flagKey" TEXT,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_projectId_idx" ON "AuditLog"("projectId");

-- CreateIndex
CREATE INDEX "AuditLog_flagId_idx" ON "AuditLog"("flagId");

-- CreateIndex
CREATE INDEX "AuditLog_envId_idx" ON "AuditLog"("envId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
