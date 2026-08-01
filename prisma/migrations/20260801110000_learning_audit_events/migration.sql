CREATE TABLE "ActivityLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "studentTaskId" TEXT,
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ActivityLog_userId_occurredAt_idx" ON "ActivityLog"("userId", "occurredAt");
CREATE INDEX "ActivityLog_studentTaskId_occurredAt_idx" ON "ActivityLog"("studentTaskId", "occurredAt");

CREATE TABLE "TaskEvent" (
  "id" TEXT NOT NULL,
  "studentTaskId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "TaskEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TaskEvent_studentTaskId_createdAt_idx" ON "TaskEvent"("studentTaskId", "createdAt");

CREATE TABLE "AutoGradeAttempt" (
  "id" TEXT NOT NULL,
  "studentTaskId" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL,
  "input" JSONB NOT NULL DEFAULT '{}',
  "score" DECIMAL(6,2),
  "result" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutoGradeAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AutoGradeAttempt_studentTaskId_attempt_key" ON "AutoGradeAttempt"("studentTaskId", "attempt");
CREATE INDEX "AutoGradeAttempt_studentTaskId_createdAt_idx" ON "AutoGradeAttempt"("studentTaskId", "createdAt");
