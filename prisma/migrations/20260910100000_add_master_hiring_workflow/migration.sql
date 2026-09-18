-- Separate the pipeline status from final hiring approval and distinguish the
-- online and physical interview stages. Existing records remain in the
-- pre-approval state and existing interviews are treated as online stages.
ALTER TABLE "Candidate" ADD COLUMN "hiringApprovalStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED';
ALTER TABLE "Candidate" ADD COLUMN "hiringApprovalRequestedAt" DATETIME;
ALTER TABLE "Candidate" ADD COLUMN "hiringApprovalRequestedByUserId" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "masterDecisionAt" DATETIME;
ALTER TABLE "Candidate" ADD COLUMN "masterDecisionByUserId" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "masterDecisionReason" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "finalDecisionAt" DATETIME;
ALTER TABLE "Candidate" ADD COLUMN "finalDecisionByUserId" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "finalDecisionReason" TEXT;
ALTER TABLE "Interview" ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'ONLINE';

CREATE INDEX "Candidate_organizationId_hiringApprovalStatus_idx"
  ON "Candidate"("organizationId", "hiringApprovalStatus");

-- Preserve candidates that were already fully selected before this workflow
-- was introduced. New candidates cannot reach SELECTED through old actions.
UPDATE "Candidate"
SET "hiringApprovalStatus" = 'FINAL_HIRED'
WHERE "status" = 'SELECTED' AND "hiringApprovalStatus" = 'NOT_REQUESTED';
