ALTER TABLE "JobRequisition"
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "openedAt" TIMESTAMP(3);

UPDATE "JobRequisition"
SET
  "approvedAt" = COALESCE("approvedAt", "createdAt"),
  "openedAt" = COALESCE("openedAt", "createdAt")
WHERE "status" = 'PUBLISHED';
