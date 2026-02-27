-- AlterTable
ALTER TABLE "FlagConfig" ALTER COLUMN "rolloutPercentage" DROP NOT NULL;
ALTER TABLE "FlagConfig" ALTER COLUMN "rolloutPercentage" DROP DEFAULT;
UPDATE "FlagConfig" SET "rolloutPercentage" = NULL WHERE "rolloutPercentage" = 0;
