-- AlterTable
ALTER TABLE "AlumniAiMessage" ADD COLUMN "moderationNote" TEXT;
ALTER TABLE "AlumniAiMessage" ADD COLUMN "moderationStatus" TEXT;
ALTER TABLE "AlumniAiMessage" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "AlumniAiMessage" ADD COLUMN "reviewedById" TEXT;
