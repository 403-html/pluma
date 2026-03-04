-- AlterTable: add email-notification fields to OrgSettings
ALTER TABLE "OrgSettings" ADD COLUMN "smtpFrom" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OrgSettings" ADD COLUMN "sendWelcomeEmail" BOOLEAN NOT NULL DEFAULT false;
