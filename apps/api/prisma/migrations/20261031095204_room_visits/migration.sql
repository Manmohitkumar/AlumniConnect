-- CreateTable
CREATE TABLE "RoomVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roomKey" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "durationSeconds" INTEGER,
    CONSTRAINT "RoomVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RoomVisit_roomKey_joinedAt_idx" ON "RoomVisit"("roomKey", "joinedAt");

-- CreateIndex
CREATE INDEX "RoomVisit_userId_joinedAt_idx" ON "RoomVisit"("userId", "joinedAt");
