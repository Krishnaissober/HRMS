CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "education" TEXT,
    "employmentHistory" TEXT,
    "skills" TEXT,
    "expectedCompensation" TEXT,
    "noticePeriod" TEXT,
    "roleOfInterest" TEXT NOT NULL,
    "experience" TEXT,
    "source" TEXT NOT NULL,
    "declarationAccepted" BOOLEAN NOT NULL DEFAULT false,
    "consentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "statusReason" TEXT,
    "statusNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CandidateSubmission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "formVersion" TEXT NOT NULL DEFAULT 'phase1-v1',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formData" JSONB NOT NULL,
    CONSTRAINT "CandidateSubmission_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CandidateDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateDocument_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CandidateActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateActivity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Candidate_referenceNo_key" ON "Candidate"("referenceNo");
CREATE UNIQUE INDEX "CandidateSubmission_referenceNo_key" ON "CandidateSubmission"("referenceNo");
CREATE UNIQUE INDEX "CandidateDocument_objectKey_key" ON "CandidateDocument"("objectKey");
CREATE INDEX "Candidate_organizationId_createdAt_idx" ON "Candidate"("organizationId", "createdAt");
CREATE INDEX "Candidate_organizationId_email_idx" ON "Candidate"("organizationId", "email");
CREATE INDEX "Candidate_organizationId_phone_idx" ON "Candidate"("organizationId", "phone");
CREATE INDEX "Candidate_organizationId_status_idx" ON "Candidate"("organizationId", "status");
CREATE INDEX "Candidate_organizationId_source_idx" ON "Candidate"("organizationId", "source");
CREATE INDEX "CandidateSubmission_organizationId_submittedAt_idx" ON "CandidateSubmission"("organizationId", "submittedAt");
CREATE INDEX "CandidateSubmission_candidateId_submittedAt_idx" ON "CandidateSubmission"("candidateId", "submittedAt");
CREATE INDEX "CandidateDocument_organizationId_candidateId_createdAt_idx" ON "CandidateDocument"("organizationId", "candidateId", "createdAt");
CREATE INDEX "CandidateActivity_organizationId_candidateId_createdAt_idx" ON "CandidateActivity"("organizationId", "candidateId", "createdAt");
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateSubmission" ADD CONSTRAINT "CandidateSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateSubmission" ADD CONSTRAINT "CandidateSubmission_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateActivity" ADD CONSTRAINT "CandidateActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateActivity" ADD CONSTRAINT "CandidateActivity_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateActivity" ADD CONSTRAINT "CandidateActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
