ALTER TABLE "Candidate" ADD COLUMN "aadhaarNumber" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "panNumber" TEXT;

CREATE TABLE "CandidateCompletionLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "requestedFields" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateCompletionLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CandidateCompletionLink_tokenHash_key" ON "CandidateCompletionLink"("tokenHash");
CREATE INDEX "CandidateCompletionLink_organizationId_candidateId_expiresAt_idx" ON "CandidateCompletionLink"("organizationId", "candidateId", "expiresAt");
ALTER TABLE "CandidateCompletionLink" ADD CONSTRAINT "CandidateCompletionLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateCompletionLink" ADD CONSTRAINT "CandidateCompletionLink_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
