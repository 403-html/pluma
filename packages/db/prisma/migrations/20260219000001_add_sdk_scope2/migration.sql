-- AlterTable: add configVersion to Environment
ALTER TABLE "Environment" ADD COLUMN "configVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: add envId to SdkToken
ALTER TABLE "SdkToken" ADD COLUMN "envId" TEXT;

-- AddForeignKey
ALTER TABLE "SdkToken" ADD CONSTRAINT "SdkToken_envId_fkey" FOREIGN KEY ("envId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
