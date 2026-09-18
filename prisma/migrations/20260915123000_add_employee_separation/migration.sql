ALTER TABLE "Employee" ADD COLUMN "separationType" TEXT;
ALTER TABLE "Employee" ADD COLUMN "separationReason" TEXT;
ALTER TABLE "Employee" ADD COLUMN "separatedAt" DATETIME;

CREATE INDEX "Employee_organizationId_separationType_idx"
  ON "Employee"("organizationId", "separationType");
