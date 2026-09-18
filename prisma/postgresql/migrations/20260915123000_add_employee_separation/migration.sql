ALTER TABLE "Employee"
  ADD COLUMN "separationType" TEXT,
  ADD COLUMN "separationReason" TEXT,
  ADD COLUMN "separatedAt" TIMESTAMP(3);

CREATE INDEX "Employee_organizationId_separationType_idx"
  ON "Employee"("organizationId", "separationType");
