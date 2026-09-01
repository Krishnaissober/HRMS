-- Phase 2 remediation: persist interview template linkage and no-show details.
ALTER TABLE "Interview" ADD COLUMN "templateId" TEXT;
ALTER TABLE "Interview" ADD COLUMN "noShowReason" TEXT;
ALTER TABLE "Interview" ADD COLUMN "noShowNotes" TEXT;

CREATE INDEX "Interview_organizationId_templateId_idx" ON "Interview"("organizationId", "templateId");

ALTER TABLE "Interview"
  ADD CONSTRAINT "Interview_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "InterviewTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
