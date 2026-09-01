-- Phase 4 remediation: prevent duplicate offers and persist delivery intent/outcomes.
CREATE TABLE "OfferDelivery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "lastError" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OfferDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfferDelivery_idempotencyKey_key" ON "OfferDelivery"("idempotencyKey");
CREATE INDEX "OfferDelivery_organizationId_status_queuedAt_idx" ON "OfferDelivery"("organizationId", "status", "queuedAt");
CREATE UNIQUE INDEX "OfferDelivery_offerId_key" ON "OfferDelivery"("offerId");
CREATE UNIQUE INDEX "Offer_hiringDecisionId_key" ON "Offer"("hiringDecisionId");

ALTER TABLE "OfferDelivery" ADD CONSTRAINT "OfferDelivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferDelivery" ADD CONSTRAINT "OfferDelivery_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
