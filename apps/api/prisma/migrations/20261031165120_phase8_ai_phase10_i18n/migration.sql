-- AlterTable
ALTER TABLE "AlumniProfile" ADD COLUMN "country" TEXT;
ALTER TABLE "AlumniProfile" ADD COLUMN "languages" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "language" TEXT;
ALTER TABLE "Event" ADD COLUMN "meetingUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN "recordingUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN "timeZone" TEXT;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN "country" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "language" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "region" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "salaryCurrency" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "salaryMax" INTEGER;
ALTER TABLE "Opportunity" ADD COLUMN "salaryMin" INTEGER;
ALTER TABLE "Opportunity" ADD COLUMN "workAuthorization" TEXT;

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN "country" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "locale" TEXT;
ALTER TABLE "User" ADD COLUMN "timeZone" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "repoUrl" TEXT,
    "demoUrl" TEXT,
    "fileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "score" INTEGER,
    "feedback" TEXT,
    "evaluatedById" TEXT,
    "evaluatedAt" DATETIME,
    "aiDraftFeedback" TEXT,
    "aiDraftScore" INTEGER,
    "aiDraftAt" DATETIME,
    "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Submission_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Submission_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Submission" ("challengeId", "createdAt", "demoUrl", "evaluatedAt", "evaluatedById", "feedback", "fileUrl", "id", "repoUrl", "score", "status", "studentId", "summary", "title", "updatedAt") SELECT "challengeId", "createdAt", "demoUrl", "evaluatedAt", "evaluatedById", "feedback", "fileUrl", "id", "repoUrl", "score", "status", "studentId", "summary", "title", "updatedAt" FROM "Submission";
DROP TABLE "Submission";
ALTER TABLE "new_Submission" RENAME TO "Submission";
CREATE INDEX "Submission_challengeId_status_idx" ON "Submission"("challengeId", "status");
CREATE INDEX "Submission_studentId_status_idx" ON "Submission"("studentId", "status");
CREATE UNIQUE INDEX "Submission_challengeId_studentId_key" ON "Submission"("challengeId", "studentId");
CREATE TABLE "new_University" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "domain" TEXT,
    "city" TEXT,
    "country" TEXT,
    "region" TEXT,
    "website" TEXT,
    "defaultLocale" TEXT NOT NULL DEFAULT 'en',
    "languages" TEXT,
    "timeZone" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_University" ("city", "createdAt", "domain", "id", "name", "shortName", "verified") SELECT "city", "createdAt", "domain", "id", "name", "shortName", "verified" FROM "University";
DROP TABLE "University";
ALTER TABLE "new_University" RENAME TO "University";
CREATE UNIQUE INDEX "University_name_key" ON "University"("name");
CREATE UNIQUE INDEX "University_domain_key" ON "University"("domain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
