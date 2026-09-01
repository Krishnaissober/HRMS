CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "name" TEXT NOT NULL, "code" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT true, "allocationDays" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "eligibility" JSONB, "accrualPolicy" JSONB, "carryForwardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxCarryForwardDays" DECIMAL(8,2), "approvalPolicy" TEXT NOT NULL DEFAULT 'HR',
    "active" BOOLEAN NOT NULL DEFAULT true, "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "leaveTypeId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL, "allocatedDays" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "carriedDays" DECIMAL(8,2) NOT NULL DEFAULT 0, "usedDays" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LeaveBalanceTransaction" (
    "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "balanceId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL, "leaveRequestId" TEXT, "transactionType" TEXT NOT NULL,
    "amountDays" DECIMAL(8,2) NOT NULL, "balanceAfter" DECIMAL(8,2) NOT NULL, "notes" TEXT,
    "actorUserId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveBalanceTransaction_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "leaveTypeId" TEXT NOT NULL,
    "startDate" DATE NOT NULL, "endDate" DATE NOT NULL, "durationDays" DECIMAL(8,2) NOT NULL,
    "durationType" TEXT NOT NULL DEFAULT 'FULL_DAY', "reason" TEXT NOT NULL,
    "attachmentObjectKey" TEXT, "attachmentFileName" TEXT, "attachmentContentType" TEXT, "attachmentByteSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING', "approvalStep" TEXT NOT NULL DEFAULT 'HR',
    "requestedByUserId" TEXT NOT NULL, "decidedAt" TIMESTAMP(3), "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LeaveApproval" (
    "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "leaveRequestId" TEXT NOT NULL,
    "step" TEXT NOT NULL, "decision" TEXT NOT NULL, "reason" TEXT, "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveApproval_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LeaveNotification" (
    "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "leaveRequestId" TEXT NOT NULL, "userId" TEXT,
    "recipientEmail" TEXT NOT NULL, "type" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PERSISTED', "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LeaveType_organizationId_active_idx" ON "LeaveType"("organizationId", "active");
CREATE UNIQUE INDEX "LeaveType_organizationId_code_key" ON "LeaveType"("organizationId", "code");
CREATE INDEX "LeaveBalance_organizationId_periodYear_idx" ON "LeaveBalance"("organizationId", "periodYear");
CREATE UNIQUE INDEX "LeaveBalance_employeeId_leaveTypeId_periodYear_key" ON "LeaveBalance"("employeeId", "leaveTypeId", "periodYear");
CREATE INDEX "LeaveBalanceTransaction_organizationId_employeeId_createdAt_idx" ON "LeaveBalanceTransaction"("organizationId", "employeeId", "createdAt");
CREATE INDEX "LeaveBalanceTransaction_organizationId_balanceId_createdAt_idx" ON "LeaveBalanceTransaction"("organizationId", "balanceId", "createdAt");
CREATE INDEX "LeaveRequest_organizationId_employeeId_startDate_endDate_idx" ON "LeaveRequest"("organizationId", "employeeId", "startDate", "endDate");
CREATE INDEX "LeaveRequest_organizationId_status_approvalStep_createdAt_idx" ON "LeaveRequest"("organizationId", "status", "approvalStep", "createdAt");
CREATE INDEX "LeaveApproval_organizationId_leaveRequestId_createdAt_idx" ON "LeaveApproval"("organizationId", "leaveRequestId", "createdAt");
CREATE INDEX "LeaveNotification_organizationId_userId_createdAt_idx" ON "LeaveNotification"("organizationId", "userId", "createdAt");
CREATE INDEX "LeaveNotification_organizationId_leaveRequestId_idx" ON "LeaveNotification"("organizationId", "leaveRequestId");
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "LeaveBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveApproval" ADD CONSTRAINT "LeaveApproval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveApproval" ADD CONSTRAINT "LeaveApproval_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveApproval" ADD CONSTRAINT "LeaveApproval_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveNotification" ADD CONSTRAINT "LeaveNotification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveNotification" ADD CONSTRAINT "LeaveNotification_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveNotification" ADD CONSTRAINT "LeaveNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
