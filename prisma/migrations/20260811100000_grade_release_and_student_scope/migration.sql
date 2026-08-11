ALTER TABLE "Grade"
  ADD COLUMN "releasedAt" TIMESTAMP(3),
  ADD COLUMN "releasedById" TEXT;

CREATE INDEX "Grade_releasedAt_idx" ON "Grade"("releasedAt");
