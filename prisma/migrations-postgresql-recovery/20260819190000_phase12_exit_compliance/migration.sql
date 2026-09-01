CREATE TABLE "ExitCase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "initiatedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT,
    "noticePeriodDays" INTEGER,
    "expectedLastWorkingDay" DATE,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExitCase_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExitClearanceTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "exitCaseId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExitClearanceTask_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExitInterview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "exitCaseId" TEXT NOT NULL,
    "feedback" JSONB NOT NULL,
    "rating" INTEGER,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExitInterview_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExitSettlement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "exitCaseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "amount" DECIMAL(14,2),
    "actedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExitSettlement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExitCase_employeeId_key" ON "ExitCase"("employeeId");
CREATE INDEX "ExitCase_organizationId_status_requestedAt_idx" ON "ExitCase"("organizationId", "status", "requestedAt");
CREATE INDEX "ExitClearanceTask_organizationId_exitCaseId_status_idx" ON "ExitClearanceTask"("organizationId", "exitCaseId", "status");
CREATE UNIQUE INDEX "ExitInterview_exitCaseId_key" ON "ExitInterview"("exitCaseId");
CREATE UNIQUE INDEX "ExitSettlement_exitCaseId_key" ON "ExitSettlement"("exitCaseId");
ALTER TABLE "ExitCase" ADD CONSTRAINT "ExitCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExitCase" ADD CONSTRAINT "ExitCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExitCase" ADD CONSTRAINT "ExitCase_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExitClearanceTask" ADD CONSTRAINT "ExitClearanceTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExitClearanceTask" ADD CONSTRAINT "ExitClearanceTask_exitCaseId_fkey" FOREIGN KEY ("exitCaseId") REFERENCES "ExitCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExitInterview" ADD CONSTRAINT "ExitInterview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExitInterview" ADD CONSTRAINT "ExitInterview_exitCaseId_fkey" FOREIGN KEY ("exitCaseId") REFERENCES "ExitCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExitInterview" ADD CONSTRAINT "ExitInterview_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExitSettlement" ADD CONSTRAINT "ExitSettlement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExitSettlement" ADD CONSTRAINT "ExitSettlement_exitCaseId_fkey" FOREIGN KEY ("exitCaseId") REFERENCES "ExitCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExitSettlement" ADD CONSTRAINT "ExitSettlement_actedByUserId_fkey" FOREIGN KEY ("actedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
