/*
  Warnings:

  - You are about to drop the column `university` on the `StudentProfile` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "domain" TEXT,
    "city" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UniversityProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "designation" TEXT,
    "department" TEXT,
    "permissions" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UniversityProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UniversityProfile_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AlumniProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "universityId" TEXT,
    "universityName" TEXT,
    "registrationNumber" TEXT,
    "graduationYear" INTEGER,
    "company" TEXT,
    "designation" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "expertise" TEXT,
    "mentorshipTopics" TEXT,
    "availability" TEXT,
    "timezone" TEXT,
    "yearsExperience" INTEGER,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" DATETIME,
    "verifiedById" TEXT,
    "mentorshipOpen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AlumniProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AlumniProfile_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AlumniProfile" ("availability", "company", "createdAt", "designation", "expertise", "graduationYear", "id", "industry", "location", "mentorshipOpen", "mentorshipTopics", "timezone", "updatedAt", "userId", "yearsExperience") SELECT "availability", "company", "createdAt", "designation", "expertise", "graduationYear", "id", "industry", "location", "mentorshipOpen", "mentorshipTopics", "timezone", "updatedAt", "userId", "yearsExperience" FROM "AlumniProfile";
DROP TABLE "AlumniProfile";
ALTER TABLE "new_AlumniProfile" RENAME TO "AlumniProfile";
CREATE UNIQUE INDEX "AlumniProfile_userId_key" ON "AlumniProfile"("userId");
CREATE INDEX "AlumniProfile_industry_mentorshipOpen_idx" ON "AlumniProfile"("industry", "mentorshipOpen");
CREATE INDEX "AlumniProfile_universityId_verificationStatus_idx" ON "AlumniProfile"("universityId", "verificationStatus");
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'ONLINE',
    "location" TEXT,
    "metaverseRoom" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "capacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "hostId" TEXT NOT NULL,
    "universityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Event_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("capacity", "category", "createdAt", "description", "endsAt", "hostId", "id", "location", "metaverseRoom", "mode", "startsAt", "status", "title", "updatedAt") SELECT "capacity", "category", "createdAt", "description", "endsAt", "hostId", "id", "location", "metaverseRoom", "mode", "startsAt", "status", "title", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE INDEX "Event_startsAt_status_idx" ON "Event"("startsAt", "status");
CREATE INDEX "Event_universityId_idx" ON "Event"("universityId");
CREATE TABLE "new_StudentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "universityId" TEXT,
    "universityName" TEXT,
    "registrationNumber" TEXT,
    "department" TEXT,
    "course" TEXT,
    "currentYear" INTEGER,
    "semester" INTEGER,
    "graduationYear" INTEGER,
    "skills" TEXT,
    "careerInterests" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" DATETIME,
    "verifiedById" TEXT,
    "portfolioVisible" BOOLEAN NOT NULL DEFAULT false,
    "visibleToCompanies" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentProfile_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StudentProfile" ("careerInterests", "consentAt", "course", "createdAt", "department", "graduationYear", "id", "portfolioVisible", "skills", "updatedAt", "userId", "visibleToCompanies") SELECT "careerInterests", "consentAt", "course", "createdAt", "department", "graduationYear", "id", "portfolioVisible", "skills", "updatedAt", "userId", "visibleToCompanies" FROM "StudentProfile";
DROP TABLE "StudentProfile";
ALTER TABLE "new_StudentProfile" RENAME TO "StudentProfile";
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");
CREATE INDEX "StudentProfile_universityId_verificationStatus_idx" ON "StudentProfile"("universityId", "verificationStatus");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "headline" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "avatarUrl" TEXT,
    "notificationPrefs" TEXT,
    "lastActiveAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatarUrl", "bio", "createdAt", "email", "emailVerified", "headline", "id", "lastActiveAt", "location", "name", "notificationPrefs", "passwordHash", "role", "status", "updatedAt") SELECT "avatarUrl", "bio", "createdAt", "email", "emailVerified", "headline", "id", "lastActiveAt", "location", "name", "notificationPrefs", "passwordHash", "role", "status", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "University_name_key" ON "University"("name");

-- CreateIndex
CREATE UNIQUE INDEX "University_domain_key" ON "University"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "UniversityProfile_userId_key" ON "UniversityProfile"("userId");

-- CreateIndex
CREATE INDEX "UniversityProfile_universityId_idx" ON "UniversityProfile"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_type_idx" ON "AuthToken"("userId", "type");
