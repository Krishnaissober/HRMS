-- Separate the pipeline status from final hiring approval and distinguish the
-- online and physical interview stages. Existing interviews remain online.
ALTER TABLE "Candidate"
  ADD COLUMN "hiringApprovalStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
  ADD COLUMN "hiringApprovalRequestedAt" TIMESTAMP(3),
  ADD COLUMN "hiringApprovalRequestedByUserId" TEXT,
  ADD COLUMN "masterDecisionAt" TIMESTAMP(3),
  ADD COLUMN "masterDecisionByUserId" TEXT,
  ADD COLUMN "masterDecisionReason" TEXT,
  ADD COLUMN "finalDecisionAt" TIMESTAMP(3),
  ADD COLUMN "finalDecisionByUserId" TEXT,
  ADD COLUMN "finalDecisionReason" TEXT;

ALTER TABLE "Interview" ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'ONLINE';

CREATE INDEX "Candidate_organizationId_hiringApprovalStatus_idx"
  ON "Candidate"("organizationId", "hiringApprovalStatus");

-- Preserve candidates selected before the approval workflow was introduced.
UPDATE "Candidate"
SET "hiringApprovalStatus" = 'FINAL_HIRED'
WHERE "status" = 'SELECTED' AND "hiringApprovalStatus" = 'NOT_REQUESTED';
