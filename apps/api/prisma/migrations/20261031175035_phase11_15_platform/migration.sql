-- CreateTable
CREATE TABLE "MetaverseRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "universityId" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "scheduledAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MetaverseRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomPresence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomPresence_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MetaverseRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT 'read',
    "createdById" TEXT NOT NULL,
    "lastUsedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "response" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DataRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MetaverseRoom_status_createdAt_idx" ON "MetaverseRoom"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RoomPresence_roomId_lastSeenAt_idx" ON "RoomPresence"("roomId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoomPresence_roomId_userId_key" ON "RoomPresence"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_createdById_revokedAt_idx" ON "ApiKey"("createdById", "revokedAt");

-- CreateIndex
CREATE INDEX "DataRequest_status_createdAt_idx" ON "DataRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DataRequest_userId_createdAt_idx" ON "DataRequest"("userId", "createdAt");
