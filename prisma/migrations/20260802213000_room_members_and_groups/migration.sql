CREATE TYPE "RoomMemberRole" AS ENUM ('OWNER', 'STUDENT');

CREATE TABLE "VirtualGroup" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VirtualGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoomMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "RoomMemberRole" NOT NULL DEFAULT 'STUDENT',
    "groupId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "gradedCount" INTEGER NOT NULL DEFAULT 0,
    "avgScore" INTEGER NOT NULL DEFAULT 0,
    "skillMetrics" JSONB NOT NULL DEFAULT '[]',
    "planProgress" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RoomMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VirtualGroup_roomId_idx" ON "VirtualGroup"("roomId");
CREATE UNIQUE INDEX "VirtualGroup_roomId_name_key" ON "VirtualGroup"("roomId", "name");
CREATE INDEX "RoomMember_roomId_role_idx" ON "RoomMember"("roomId", "role");
CREATE INDEX "RoomMember_groupId_idx" ON "RoomMember"("groupId");
CREATE UNIQUE INDEX "RoomMember_roomId_displayName_key" ON "RoomMember"("roomId", "displayName");

ALTER TABLE "VirtualGroup" ADD CONSTRAINT "VirtualGroup_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TrainingRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TrainingRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "VirtualGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
