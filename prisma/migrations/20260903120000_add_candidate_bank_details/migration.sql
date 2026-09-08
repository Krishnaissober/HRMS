-- Add optional payroll bank details for HR-managed onboarding.
ALTER TABLE "Candidate" ADD COLUMN "bankAccountName" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "bankName" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "bankBranchName" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "bankIfscCode" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "bankAccountType" TEXT;
