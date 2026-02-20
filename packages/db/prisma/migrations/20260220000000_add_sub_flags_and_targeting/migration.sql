-- AlterTable: add parentFlagId to FeatureFlag for sub-flag hierarchy
ALTER TABLE "FeatureFlag" ADD COLUMN "parentFlagId" TEXT;

-- AddForeignKey: self-referential parent relation (cascade delete child flags)
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_parentFlagId_fkey" FOREIGN KEY ("parentFlagId") REFERENCES "FeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add allowList and denyList to FlagConfig for per-subject targeting
ALTER TABLE "FlagConfig" ADD COLUMN "allowList" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "FlagConfig" ADD COLUMN "denyList" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
