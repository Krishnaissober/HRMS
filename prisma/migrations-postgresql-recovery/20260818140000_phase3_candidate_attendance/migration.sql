-- Phase 3: extend existing candidate visits into tenant-scoped attendance records.
ALTER TABLE "CandidateVisit" ADD COLUMN "interviewId" TEXT;
ALTER TABLE "CandidateVisit" ADD COLUMN "hostUserId" TEXT;
ALTER TABLE "CandidateVisit" ADD COLUMN "checkInActorUserId" TEXT;
ALTER TABLE "CandidateVisit" ADD COLUMN "checkOutActorUserId" TEXT;
ALTER TABLE "CandidateVisit" ADD COLUMN "lateArrivalMinutes" INTEGER;
ALTER TABLE "CandidateVisit" ADD COLUMN "earlyDepartureMinutes" INTEGER;
ALTER TABLE "CandidateVisit" ADD COLUMN "durationMinutes" INTEGER;
ALTER TABLE "CandidateVisit" ADD COLUMN "exceptionType" TEXT;
ALTER TABLE "CandidateVisit" ADD COLUMN "exceptionNotes" TEXT;

CREATE INDEX "CandidateVisit_organizationId_interviewId_idx" ON "CandidateVisit"("organizationId", "interviewId");
CREATE INDEX "CandidateVisit_organizationId_hostUserId_visitDate_idx" ON "CandidateVisit"("organizationId", "hostUserId", "visitDate");

ALTER TABLE "CandidateVisit"
  ADD CONSTRAINT "CandidateVisit_interviewId_fkey"
  FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CandidateVisit"
  ADD CONSTRAINT "CandidateVisit_hostUserId_fkey"
  FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CandidateVisit"
  ADD CONSTRAINT "CandidateVisit_checkInActorUserId_fkey"
  FOREIGN KEY ("checkInActorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CandidateVisit"
  ADD CONSTRAINT "CandidateVisit_checkOutActorUserId_fkey"
  FOREIGN KEY ("checkOutActorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
