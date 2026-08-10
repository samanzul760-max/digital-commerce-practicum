CREATE TYPE "ResourceSource" AS ENUM ('SOFTWARE_CENTER', 'SKILL_CAMP', 'ENTERPRISE_TASK_LIBRARY');
CREATE TYPE "SandboxType" AS ENUM ('STORE_BASICS', 'PRODUCT_MANAGEMENT', 'STORE_DECORATION', 'MARKETING', 'BUSINESS_ANALYTICS');
CREATE TYPE "TrainingRoomType" AS ENUM ('TEACHING', 'COMPETITION', 'CERTIFICATION');
CREATE TYPE "TaskSectionType" AS ENUM ('WORK_ORDER', 'MEDIA', 'QUIZ', 'SANDBOX');
CREATE TYPE "MediaKind" AS ENUM ('PPT', 'VIDEO', 'PDF', 'IMAGE', 'LINK');
CREATE TYPE "QuestionType" AS ENUM ('SINGLE', 'MULTIPLE', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT_ANSWER');

ALTER TABLE "TrainingRoom" ADD COLUMN "type" "TrainingRoomType" NOT NULL DEFAULT 'TEACHING';

CREATE TABLE "ResourceCatalogItem" (
  "id" TEXT NOT NULL,
  "source" "ResourceSource" NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "capabilityTags" JSONB NOT NULL DEFAULT '[]',
  "version" INTEGER NOT NULL DEFAULT 1,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "configuration" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResourceCatalogItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkOrderTemplate" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "defaultAutoWeight" DECIMAL(5,2) NOT NULL DEFAULT 70,
  "defaultManualWeight" DECIMAL(5,2) NOT NULL DEFAULT 30,
  "sectionsSnapshot" JSONB NOT NULL,
  "createdById" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkOrderTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PlanAssignment"
  ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "templateId" TEXT,
  ADD COLUMN "autoScoreWeight" DECIMAL(5,2) NOT NULL DEFAULT 70,
  ADD COLUMN "manualScoreWeight" DECIMAL(5,2) NOT NULL DEFAULT 30,
  ADD COLUMN "timeLimitMinutes" INTEGER,
  ADD COLUMN "assignmentVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "publishedSnapshot" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE TABLE "TaskSection" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "type" "TaskSectionType" NOT NULL,
  "parentId" TEXT,
  "resourceId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "sort" INTEGER NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "weightPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "config" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "TaskSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaResource" (
  "id" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "kind" "MediaKind" NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT,
  "storageKey" TEXT,
  "mimeType" TEXT,
  "durationSec" INTEGER,
  "sort" INTEGER NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "MediaResource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskQuestion" (
  "id" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "type" "QuestionType" NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" JSONB NOT NULL DEFAULT '[]',
  "answerKey" JSONB NOT NULL DEFAULT '{}',
  "explanation" TEXT NOT NULL DEFAULT '',
  "points" DECIMAL(6,2) NOT NULL,
  "sort" INTEGER NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "TaskQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SandboxSpec" (
  "id" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "sandboxType" "SandboxType" NOT NULL,
  "appKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "config" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "SandboxSpec_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SandboxStep" (
  "id" TEXT NOT NULL,
  "sandboxId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "instruction" TEXT NOT NULL,
  "sort" INTEGER NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "fields" JSONB NOT NULL DEFAULT '[]',
  "evidenceKey" TEXT,
  CONSTRAINT "SandboxStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SandboxRubricItem" (
  "id" TEXT NOT NULL,
  "sandboxId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "points" DECIMAL(6,2) NOT NULL,
  "stepId" TEXT,
  "sort" INTEGER NOT NULL,
  CONSTRAINT "SandboxRubricItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResourceCatalogItem_source_enabled_idx" ON "ResourceCatalogItem"("source", "enabled");
CREATE INDEX "WorkOrderTemplate_organizationId_title_idx" ON "WorkOrderTemplate"("organizationId", "title");
CREATE UNIQUE INDEX "WorkOrderTemplate_createdById_idempotencyKey_key" ON "WorkOrderTemplate"("createdById", "idempotencyKey");
CREATE INDEX "PlanAssignment_templateId_idx" ON "PlanAssignment"("templateId");
CREATE UNIQUE INDEX "TaskSection_assignmentId_sort_key" ON "TaskSection"("assignmentId", "sort");
CREATE INDEX "TaskSection_assignmentId_type_idx" ON "TaskSection"("assignmentId", "type");
CREATE INDEX "TaskSection_parentId_idx" ON "TaskSection"("parentId");
CREATE INDEX "TaskSection_resourceId_idx" ON "TaskSection"("resourceId");
CREATE UNIQUE INDEX "MediaResource_sectionId_sort_key" ON "MediaResource"("sectionId", "sort");
CREATE UNIQUE INDEX "TaskQuestion_sectionId_sort_key" ON "TaskQuestion"("sectionId", "sort");
CREATE INDEX "TaskQuestion_sectionId_type_idx" ON "TaskQuestion"("sectionId", "type");
CREATE UNIQUE INDEX "SandboxSpec_sectionId_key" ON "SandboxSpec"("sectionId");
CREATE UNIQUE INDEX "SandboxStep_sandboxId_sort_key" ON "SandboxStep"("sandboxId", "sort");
CREATE UNIQUE INDEX "SandboxRubricItem_sandboxId_sort_key" ON "SandboxRubricItem"("sandboxId", "sort");

ALTER TABLE "PlanAssignment" ADD CONSTRAINT "PlanAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkOrderTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskSection" ADD CONSTRAINT "TaskSection_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "PlanAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskSection" ADD CONSTRAINT "TaskSection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TaskSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskSection" ADD CONSTRAINT "TaskSection_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "ResourceCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaResource" ADD CONSTRAINT "MediaResource_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TaskSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskQuestion" ADD CONSTRAINT "TaskQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TaskSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SandboxSpec" ADD CONSTRAINT "SandboxSpec_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TaskSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SandboxStep" ADD CONSTRAINT "SandboxStep_sandboxId_fkey" FOREIGN KEY ("sandboxId") REFERENCES "SandboxSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SandboxRubricItem" ADD CONSTRAINT "SandboxRubricItem_sandboxId_fkey" FOREIGN KEY ("sandboxId") REFERENCES "SandboxSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;
