-- Allow HR to revoke and regenerate candidate self-service onboarding links.
ALTER TABLE "CandidateCompletionLink" ADD COLUMN "revokedAt" TIMESTAMP(3);
