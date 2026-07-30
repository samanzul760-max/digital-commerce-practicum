-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL,
    "planAssignmentId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "prerequisiteActivityId" TEXT NOT NULL,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_planAssignmentId_activityId_prerequisiteActi_key" ON "TaskDependency"("planAssignmentId", "activityId", "prerequisiteActivityId");

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_planAssignmentId_fkey" FOREIGN KEY ("planAssignmentId") REFERENCES "PlanAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
