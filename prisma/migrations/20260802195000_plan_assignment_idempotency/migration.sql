CREATE TABLE "PlanAssignmentIdempotencyKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "planAssignmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanAssignmentIdempotencyKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanAssignmentIdempotencyKey_userId_method_path_key_key"
ON "PlanAssignmentIdempotencyKey"("userId", "method", "path", "key");

CREATE INDEX "PlanAssignmentIdempotencyKey_planAssignmentId_idx"
ON "PlanAssignmentIdempotencyKey"("planAssignmentId");

ALTER TABLE "PlanAssignmentIdempotencyKey"
ADD CONSTRAINT "PlanAssignmentIdempotencyKey_planAssignmentId_fkey"
FOREIGN KEY ("planAssignmentId") REFERENCES "PlanAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
