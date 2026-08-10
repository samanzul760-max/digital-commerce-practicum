CREATE TYPE "SubmissionPartStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVIEW', 'GRADED');

ALTER TABLE "SubmissionVersion"
  ALTER COLUMN "text" SET DEFAULT '',
  ADD COLUMN "artifact" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "operationSummary" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "SandboxSession" (
  "id" TEXT NOT NULL,
  "studentTaskId" TEXT NOT NULL,
  "state" JSONB NOT NULL DEFAULT '{}',
  "startedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SandboxSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SandboxSnapshot" (
  "id" TEXT NOT NULL,
  "sandboxSessionId" TEXT NOT NULL,
  "studentTaskId" TEXT NOT NULL,
  "sectionId" TEXT,
  "sandboxType" "SandboxType",
  "stepId" TEXT,
  "artifact" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SandboxSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubmissionPart" (
  "id" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "status" "SubmissionPartStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "answer" JSONB NOT NULL DEFAULT '{}',
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "autoScore" DECIMAL(6,2),
  "teacherScore" DECIMAL(6,2),
  "teacherComment" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "SubmissionPart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SandboxSession_studentTaskId_key" ON "SandboxSession"("studentTaskId");
CREATE INDEX "SandboxSession_studentTaskId_updatedAt_idx" ON "SandboxSession"("studentTaskId", "updatedAt");
CREATE INDEX "SandboxSnapshot_studentTaskId_createdAt_idx" ON "SandboxSnapshot"("studentTaskId", "createdAt");
CREATE INDEX "SandboxSnapshot_sandboxSessionId_createdAt_idx" ON "SandboxSnapshot"("sandboxSessionId", "createdAt");
CREATE UNIQUE INDEX "SubmissionPart_versionId_sectionId_key" ON "SubmissionPart"("versionId", "sectionId");
CREATE INDEX "SubmissionPart_sectionId_status_idx" ON "SubmissionPart"("sectionId", "status");

ALTER TABLE "SandboxSession" ADD CONSTRAINT "SandboxSession_studentTaskId_fkey" FOREIGN KEY ("studentTaskId") REFERENCES "StudentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SandboxSnapshot" ADD CONSTRAINT "SandboxSnapshot_sandboxSessionId_fkey" FOREIGN KEY ("sandboxSessionId") REFERENCES "SandboxSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SandboxSnapshot" ADD CONSTRAINT "SandboxSnapshot_studentTaskId_fkey" FOREIGN KEY ("studentTaskId") REFERENCES "StudentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionPart" ADD CONSTRAINT "SubmissionPart_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SubmissionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
