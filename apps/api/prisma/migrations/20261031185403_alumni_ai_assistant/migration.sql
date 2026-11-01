-- CreateTable
CREATE TABLE "AlumniAiSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alumniId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "permissionLevel" INTEGER NOT NULL DEFAULT 1,
    "useProfile" BOOLEAN NOT NULL DEFAULT true,
    "useExperience" BOOLEAN NOT NULL DEFAULT true,
    "useResources" BOOLEAN NOT NULL DEFAULT true,
    "useApprovedAnswers" BOOLEAN NOT NULL DEFAULT false,
    "usePrivateMessages" BOOLEAN NOT NULL DEFAULT false,
    "pausedAt" DATETIME,
    "disabledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AlumniAiSettings_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlumniAiKnowledge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alumniId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AlumniAiKnowledge_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlumniAiConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "alumniId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AlumniAiConversation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AlumniAiConversation_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlumniAiMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlumniAiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AlumniAiConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AlumniAiSettings_alumniId_key" ON "AlumniAiSettings"("alumniId");

-- CreateIndex
CREATE INDEX "AlumniAiKnowledge_alumniId_approved_revokedAt_idx" ON "AlumniAiKnowledge"("alumniId", "approved", "revokedAt");

-- CreateIndex
CREATE INDEX "AlumniAiConversation_alumniId_updatedAt_idx" ON "AlumniAiConversation"("alumniId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AlumniAiConversation_studentId_alumniId_key" ON "AlumniAiConversation"("studentId", "alumniId");

-- CreateIndex
CREATE INDEX "AlumniAiMessage_conversationId_createdAt_idx" ON "AlumniAiMessage"("conversationId", "createdAt");
