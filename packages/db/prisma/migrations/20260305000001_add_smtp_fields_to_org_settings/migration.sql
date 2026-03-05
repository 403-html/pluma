-- AlterTable: add SMTP connection fields to OrgSettings (moved from env vars)
ALTER TABLE "OrgSettings" ADD COLUMN "smtpHost"   TEXT    NOT NULL DEFAULT '';
ALTER TABLE "OrgSettings" ADD COLUMN "smtpPort"   INTEGER NOT NULL DEFAULT 587;
ALTER TABLE "OrgSettings" ADD COLUMN "smtpSecure" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrgSettings" ADD COLUMN "smtpUser"   TEXT    NOT NULL DEFAULT '';
ALTER TABLE "OrgSettings" ADD COLUMN "smtpPass"   TEXT    NOT NULL DEFAULT '';
