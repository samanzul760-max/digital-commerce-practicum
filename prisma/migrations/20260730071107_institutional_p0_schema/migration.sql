-- CreateEnum
CREATE TYPE "EnrollmentRole" AS ENUM ('STUDENT', 'TEACHER', 'MENTOR', 'ASSISTANT', 'HEAD_TEACHER');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'SUBMITTED', 'RETURNED', 'GRADED', 'CLOSED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRoom" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TrainingRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "EnrollmentRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanAssignment" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "availableAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "lateAllowed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlanAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTask" (
    "id" TEXT NOT NULL,
    "planAssignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'LOCKED',
    "availableAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),

    CONSTRAINT "StudentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "studentTaskId" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionVersion" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "links" JSONB NOT NULL DEFAULT '[]',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "score" DECIMAL(6,2) NOT NULL,
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeItem" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "rubricItemId" TEXT NOT NULL,
    "score" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "GradeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingRoom_organizationId_idx" ON "TrainingRoom"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_organizationId_name_key" ON "Cohort"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Class_roomId_idx" ON "Class"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Class_cohortId_name_key" ON "Class"("cohortId", "name");

-- CreateIndex
CREATE INDEX "ClassEnrollment_userId_role_idx" ON "ClassEnrollment"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_classId_userId_key" ON "ClassEnrollment"("classId", "userId");

-- CreateIndex
CREATE INDEX "PlanAssignment_classId_status_idx" ON "PlanAssignment"("classId", "status");

-- CreateIndex
CREATE INDEX "StudentTask_studentId_status_idx" ON "StudentTask"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentTask_planAssignmentId_studentId_activityId_key" ON "StudentTask"("planAssignmentId", "studentId", "activityId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_studentTaskId_key" ON "Submission"("studentTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionVersion_submissionId_version_key" ON "SubmissionVersion"("submissionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_submissionId_key" ON "Grade"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeItem_gradeId_rubricItemId_key" ON "GradeItem"("gradeId", "rubricItemId");

-- AddForeignKey
ALTER TABLE "TrainingRoom" ADD CONSTRAINT "TrainingRoom_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TrainingRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAssignment" ADD CONSTRAINT "PlanAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTask" ADD CONSTRAINT "StudentTask_planAssignmentId_fkey" FOREIGN KEY ("planAssignmentId") REFERENCES "PlanAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentTaskId_fkey" FOREIGN KEY ("studentTaskId") REFERENCES "StudentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionVersion" ADD CONSTRAINT "SubmissionVersion_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeItem" ADD CONSTRAINT "GradeItem_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
