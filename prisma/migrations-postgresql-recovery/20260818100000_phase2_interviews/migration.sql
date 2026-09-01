CREATE TABLE "InterviewTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "questions" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InterviewTemplate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "location" TEXT,
    "meetingLink" TEXT,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdByUserId" TEXT NOT NULL,
    "candidateCheckedInAt" TIMESTAMP(3),
    "candidateCheckedOutAt" TIMESTAMP(3),
    "checkInActorUserId" TEXT,
    "checkOutActorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InterviewParticipant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'INTERVIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterviewParticipant_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InterviewEvaluation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "templateId" TEXT,
    "scores" JSONB NOT NULL,
    "comments" TEXT,
    "recommendation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InterviewEvaluation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InterviewActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterviewActivity_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InterviewAvailability" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InterviewAvailability_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InterviewNotification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterviewNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InterviewTemplate_organizationId_status_idx" ON "InterviewTemplate"("organizationId", "status");
CREATE UNIQUE INDEX "Interview_referenceNo_key" ON "Interview"("referenceNo");
CREATE INDEX "Interview_organizationId_scheduledStart_idx" ON "Interview"("organizationId", "scheduledStart");
CREATE INDEX "Interview_organizationId_status_idx" ON "Interview"("organizationId", "status");
CREATE INDEX "Interview_candidateId_scheduledStart_idx" ON "Interview"("candidateId", "scheduledStart");
CREATE INDEX "Interview_applicationId_round_idx" ON "Interview"("applicationId", "round");
CREATE INDEX "InterviewParticipant_organizationId_userId_idx" ON "InterviewParticipant"("organizationId", "userId");
CREATE UNIQUE INDEX "InterviewParticipant_interviewId_userId_key" ON "InterviewParticipant"("interviewId", "userId");
CREATE INDEX "InterviewEvaluation_organizationId_interviewerId_idx" ON "InterviewEvaluation"("organizationId", "interviewerId");
CREATE INDEX "InterviewEvaluation_organizationId_status_idx" ON "InterviewEvaluation"("organizationId", "status");
CREATE UNIQUE INDEX "InterviewEvaluation_interviewId_interviewerId_key" ON "InterviewEvaluation"("interviewId", "interviewerId");
CREATE INDEX "InterviewActivity_organizationId_interviewId_createdAt_idx" ON "InterviewActivity"("organizationId", "interviewId", "createdAt");
CREATE INDEX "InterviewAvailability_organizationId_userId_startsAt_idx" ON "InterviewAvailability"("organizationId", "userId", "startsAt");
CREATE INDEX "InterviewNotification_organizationId_scheduledFor_status_idx" ON "InterviewNotification"("organizationId", "scheduledFor", "status");
CREATE UNIQUE INDEX "InterviewNotification_interviewId_type_recipient_key" ON "InterviewNotification"("interviewId", "type", "recipient");
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");
ALTER TABLE "InterviewTemplate" ADD CONSTRAINT "InterviewTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewTemplate" ADD CONSTRAINT "InterviewTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_checkInActorUserId_fkey" FOREIGN KEY ("checkInActorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_checkOutActorUserId_fkey" FOREIGN KEY ("checkOutActorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewParticipant" ADD CONSTRAINT "InterviewParticipant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewParticipant" ADD CONSTRAINT "InterviewParticipant_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewParticipant" ADD CONSTRAINT "InterviewParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InterviewTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewActivity" ADD CONSTRAINT "InterviewActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewActivity" ADD CONSTRAINT "InterviewActivity_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewActivity" ADD CONSTRAINT "InterviewActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewAvailability" ADD CONSTRAINT "InterviewAvailability_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewAvailability" ADD CONSTRAINT "InterviewAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewNotification" ADD CONSTRAINT "InterviewNotification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewNotification" ADD CONSTRAINT "InterviewNotification_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER INDEX "Organization_audit_created_idx" RENAME TO "AuditLog_organizationId_createdAt_idx";
