CREATE TABLE "JobRequisition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobRequisition_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CandidateVisit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CandidateVisit_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "CandidateSubmission" ADD COLUMN "applicationId" TEXT;
CREATE UNIQUE INDEX "JobRequisition_referenceNo_key" ON "JobRequisition"("referenceNo");
CREATE UNIQUE INDEX "Application_referenceNo_key" ON "Application"("referenceNo");
CREATE UNIQUE INDEX "Application_candidateId_requisitionId_key" ON "Application"("candidateId", "requisitionId");
CREATE INDEX "JobRequisition_organizationId_status_idx" ON "JobRequisition"("organizationId", "status");
CREATE INDEX "Application_organizationId_status_idx" ON "Application"("organizationId", "status");
CREATE INDEX "Application_organizationId_requisitionId_idx" ON "Application"("organizationId", "requisitionId");
CREATE INDEX "CandidateVisit_organizationId_candidateId_visitDate_idx" ON "CandidateVisit"("organizationId", "candidateId", "visitDate");
CREATE INDEX "CandidateVisit_organizationId_status_idx" ON "CandidateVisit"("organizationId", "status");
ALTER TABLE "JobRequisition" ADD CONSTRAINT "JobRequisition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "JobRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateVisit" ADD CONSTRAINT "CandidateVisit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateVisit" ADD CONSTRAINT "CandidateVisit_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateSubmission" ADD CONSTRAINT "CandidateSubmission_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
