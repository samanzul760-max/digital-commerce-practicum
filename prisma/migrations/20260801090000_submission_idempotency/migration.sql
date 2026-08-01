-- CreateTable
CREATE TABLE "SubmissionIdempotencyKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionIdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionIdempotencyKey_userId_method_path_key_key" ON "SubmissionIdempotencyKey"("userId", "method", "path", "key");

-- CreateIndex
CREATE INDEX "SubmissionIdempotencyKey_submissionId_idx" ON "SubmissionIdempotencyKey"("submissionId");

-- AddForeignKey
ALTER TABLE "SubmissionIdempotencyKey" ADD CONSTRAINT "SubmissionIdempotencyKey_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
