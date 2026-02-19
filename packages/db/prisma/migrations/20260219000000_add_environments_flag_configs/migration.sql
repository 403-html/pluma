-- AlterTable: remove enabled and updatedAt from FeatureFlag, add description
ALTER TABLE "FeatureFlag" DROP COLUMN IF EXISTS "enabled";
ALTER TABLE "FeatureFlag" DROP COLUMN IF EXISTS "updatedAt";
ALTER TABLE "FeatureFlag" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlagConfig" (
    "envId" TEXT NOT NULL,
    "flagId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FlagConfig_pkey" PRIMARY KEY ("envId","flagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Environment_projectId_key_key" ON "Environment"("projectId", "key");

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlagConfig" ADD CONSTRAINT "FlagConfig_envId_fkey" FOREIGN KEY ("envId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlagConfig" ADD CONSTRAINT "FlagConfig_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "FeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
