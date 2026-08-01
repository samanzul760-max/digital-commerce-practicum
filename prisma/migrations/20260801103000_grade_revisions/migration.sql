CREATE TABLE "GradeRevision" (
  "id" TEXT NOT NULL,
  "gradeId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "feedback" TEXT NOT NULL,
  "score" DECIMAL(6,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GradeRevision_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GradeRevision" ADD CONSTRAINT "GradeRevision_gradeId_fkey"
  FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "GradeRevision_gradeId_revision_key" ON "GradeRevision"("gradeId", "revision");
CREATE INDEX "GradeRevision_gradeId_createdAt_idx" ON "GradeRevision"("gradeId", "createdAt");
