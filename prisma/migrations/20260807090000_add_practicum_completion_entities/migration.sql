CREATE TABLE "TrainingRoomSetting" (
    "id" TEXT NOT NULL,
    "trainingRoomId" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT,
    "teachingMode" TEXT NOT NULL DEFAULT 'STANDARD',
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingRoomSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassAnnouncement" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "targetGroupId" TEXT,
    "authorId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClassAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeachingSession" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "startedById" TEXT NOT NULL,
    "currentActivityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "idempotencyKey" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeachingSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityExecution" (
    "id" TEXT NOT NULL,
    "teachingSessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActivityExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JoinApplication" (
    "id" TEXT NOT NULL,
    "trainingRoomId" TEXT NOT NULL,
    "targetGroupId" TEXT,
    "applicantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JoinApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberInvite" (
    "id" TEXT NOT NULL,
    "trainingRoomId" TEXT NOT NULL,
    "targetGroupId" TEXT,
    "invitedById" TEXT NOT NULL,
    "invitee" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "idempotencyKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MemberInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "trainingRoomId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PracticumTemplate" (
    "id" TEXT NOT NULL,
    "trainingRoomId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PracticumTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "trainingRoomId" TEXT NOT NULL,
    "templateId" TEXT,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompetitionEntry" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CompetitionEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainingRoomSetting_trainingRoomId_key" ON "TrainingRoomSetting"("trainingRoomId");
CREATE UNIQUE INDEX "ClassAnnouncement_classId_authorId_idempotencyKey_key" ON "ClassAnnouncement"("classId", "authorId", "idempotencyKey");
CREATE INDEX "ClassAnnouncement_classId_status_idx" ON "ClassAnnouncement"("classId", "status");
CREATE INDEX "ClassAnnouncement_targetGroupId_idx" ON "ClassAnnouncement"("targetGroupId");
CREATE UNIQUE INDEX "TeachingSession_classId_idempotencyKey_key" ON "TeachingSession"("classId", "idempotencyKey");
CREATE INDEX "TeachingSession_classId_status_idx" ON "TeachingSession"("classId", "status");
CREATE UNIQUE INDEX "ActivityExecution_teachingSessionId_memberId_activityId_key" ON "ActivityExecution"("teachingSessionId", "memberId", "activityId");
CREATE INDEX "ActivityExecution_memberId_status_idx" ON "ActivityExecution"("memberId", "status");
CREATE UNIQUE INDEX "JoinApplication_trainingRoomId_applicantId_idempotencyKey_key" ON "JoinApplication"("trainingRoomId", "applicantId", "idempotencyKey");
CREATE INDEX "JoinApplication_trainingRoomId_status_idx" ON "JoinApplication"("trainingRoomId", "status");
CREATE INDEX "JoinApplication_targetGroupId_idx" ON "JoinApplication"("targetGroupId");
CREATE UNIQUE INDEX "MemberInvite_inviteCode_key" ON "MemberInvite"("inviteCode");
CREATE UNIQUE INDEX "MemberInvite_trainingRoomId_invitedById_idempotencyKey_key" ON "MemberInvite"("trainingRoomId", "invitedById", "idempotencyKey");
CREATE INDEX "MemberInvite_trainingRoomId_status_idx" ON "MemberInvite"("trainingRoomId", "status");
CREATE INDEX "MemberInvite_targetGroupId_idx" ON "MemberInvite"("targetGroupId");
CREATE INDEX "MemberInvite_expiresAt_idx" ON "MemberInvite"("expiresAt");
CREATE INDEX "AuditEvent_trainingRoomId_occurredAt_idx" ON "AuditEvent"("trainingRoomId", "occurredAt");
CREATE INDEX "AuditEvent_trainingRoomId_entityType_entityId_idx" ON "AuditEvent"("trainingRoomId", "entityType", "entityId");
CREATE UNIQUE INDEX "PracticumTemplate_trainingRoomId_templateKey_key" ON "PracticumTemplate"("trainingRoomId", "templateKey");
CREATE INDEX "PracticumTemplate_trainingRoomId_enabled_idx" ON "PracticumTemplate"("trainingRoomId", "enabled");
CREATE INDEX "Competition_trainingRoomId_status_idx" ON "Competition"("trainingRoomId", "status");
CREATE INDEX "Competition_templateId_idx" ON "Competition"("templateId");
CREATE UNIQUE INDEX "CompetitionEntry_competitionId_memberId_key" ON "CompetitionEntry"("competitionId", "memberId");
CREATE INDEX "CompetitionEntry_memberId_status_idx" ON "CompetitionEntry"("memberId", "status");

ALTER TABLE "TrainingRoomSetting" ADD CONSTRAINT "TrainingRoomSetting_trainingRoomId_fkey" FOREIGN KEY ("trainingRoomId") REFERENCES "TrainingRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassAnnouncement" ADD CONSTRAINT "ClassAnnouncement_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassAnnouncement" ADD CONSTRAINT "ClassAnnouncement_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "VirtualGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeachingSession" ADD CONSTRAINT "TeachingSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityExecution" ADD CONSTRAINT "ActivityExecution_teachingSessionId_fkey" FOREIGN KEY ("teachingSessionId") REFERENCES "TeachingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityExecution" ADD CONSTRAINT "ActivityExecution_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "RoomMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JoinApplication" ADD CONSTRAINT "JoinApplication_trainingRoomId_fkey" FOREIGN KEY ("trainingRoomId") REFERENCES "TrainingRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JoinApplication" ADD CONSTRAINT "JoinApplication_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "VirtualGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberInvite" ADD CONSTRAINT "MemberInvite_trainingRoomId_fkey" FOREIGN KEY ("trainingRoomId") REFERENCES "TrainingRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberInvite" ADD CONSTRAINT "MemberInvite_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "VirtualGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_trainingRoomId_fkey" FOREIGN KEY ("trainingRoomId") REFERENCES "TrainingRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticumTemplate" ADD CONSTRAINT "PracticumTemplate_trainingRoomId_fkey" FOREIGN KEY ("trainingRoomId") REFERENCES "TrainingRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_trainingRoomId_fkey" FOREIGN KEY ("trainingRoomId") REFERENCES "TrainingRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PracticumTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "RoomMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
