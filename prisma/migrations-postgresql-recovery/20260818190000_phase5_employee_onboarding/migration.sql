-- Phase 5: employee conversion, onboarding, documents and onboarding foundations.
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "employeeNo" TEXT NOT NULL,
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
    "profileImageUrl" TEXT,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT,
    "location" TEXT,
    "employmentType" TEXT,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "probationDurationDays" INTEGER,
    "probationEndDate" TIMESTAMP(3),
    "confirmationDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PROBATION',
    "managerEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EmployeeHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "notes" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeHistory_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OnboardingTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "role" TEXT,
    "employmentType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OnboardingTemplate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OnboardingTaskDefinition" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "dueDays" INTEGER,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingTaskDefinition_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OnboardingInstance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRE_JOINING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OnboardingInstance_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OnboardingTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "onboardingId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "assigneeUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OnboardingDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "onboardingId" TEXT,
    "kind" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OnboardingDocument_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OnboardingAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "notes" TEXT,
    CONSTRAINT "OnboardingAsset_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SystemAccessProvisioning" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provisionedAt" TIMESTAMP(3),
    "notes" TEXT,
    CONSTRAINT "SystemAccessProvisioning_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MentorAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    CONSTRAINT "MentorAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Employee_candidateId_key" ON "Employee"("candidateId");
CREATE UNIQUE INDEX "Employee_applicationId_key" ON "Employee"("applicationId");
CREATE UNIQUE INDEX "Employee_employeeNo_key" ON "Employee"("employeeNo");
CREATE INDEX "Employee_organizationId_status_idx" ON "Employee"("organizationId", "status");
CREATE INDEX "Employee_organizationId_department_idx" ON "Employee"("organizationId", "department");
CREATE INDEX "EmployeeHistory_organizationId_employeeId_effectiveDate_idx" ON "EmployeeHistory"("organizationId", "employeeId", "effectiveDate");
CREATE INDEX "OnboardingTemplate_organizationId_status_idx" ON "OnboardingTemplate"("organizationId", "status");
CREATE INDEX "OnboardingTaskDefinition_templateId_sortOrder_idx" ON "OnboardingTaskDefinition"("templateId", "sortOrder");
CREATE INDEX "OnboardingInstance_organizationId_status_idx" ON "OnboardingInstance"("organizationId", "status");
CREATE UNIQUE INDEX "OnboardingInstance_employeeId_templateId_key" ON "OnboardingInstance"("employeeId", "templateId");
CREATE INDEX "OnboardingTask_organizationId_onboardingId_status_idx" ON "OnboardingTask"("organizationId", "onboardingId", "status");
CREATE INDEX "OnboardingTask_organizationId_assigneeUserId_dueDate_idx" ON "OnboardingTask"("organizationId", "assigneeUserId", "dueDate");
CREATE UNIQUE INDEX "OnboardingDocument_objectKey_key" ON "OnboardingDocument"("objectKey");
CREATE INDEX "OnboardingDocument_organizationId_employeeId_status_idx" ON "OnboardingDocument"("organizationId", "employeeId", "status");
CREATE INDEX "OnboardingAsset_organizationId_employeeId_status_idx" ON "OnboardingAsset"("organizationId", "employeeId", "status");
CREATE UNIQUE INDEX "OnboardingAsset_organizationId_assetType_identifier_status_key" ON "OnboardingAsset"("organizationId", "assetType", "identifier", "status");
CREATE UNIQUE INDEX "SystemAccessProvisioning_employeeId_systemName_key" ON "SystemAccessProvisioning"("employeeId", "systemName");
CREATE INDEX "SystemAccessProvisioning_organizationId_status_idx" ON "SystemAccessProvisioning"("organizationId", "status");
CREATE INDEX "MentorAssignment_organizationId_employeeId_endedAt_idx" ON "MentorAssignment"("organizationId", "employeeId", "endedAt");
CREATE INDEX "MentorAssignment_organizationId_mentorId_idx" ON "MentorAssignment"("organizationId", "mentorId");
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployeeHistory" ADD CONSTRAINT "EmployeeHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeHistory" ADD CONSTRAINT "EmployeeHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeHistory" ADD CONSTRAINT "EmployeeHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingTemplate" ADD CONSTRAINT "OnboardingTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingTemplate" ADD CONSTRAINT "OnboardingTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OnboardingTaskDefinition" ADD CONSTRAINT "OnboardingTaskDefinition_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingInstance" ADD CONSTRAINT "OnboardingInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingInstance" ADD CONSTRAINT "OnboardingInstance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingInstance" ADD CONSTRAINT "OnboardingInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "OnboardingInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "OnboardingTaskDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "OnboardingInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingAsset" ADD CONSTRAINT "OnboardingAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingAsset" ADD CONSTRAINT "OnboardingAsset_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemAccessProvisioning" ADD CONSTRAINT "SystemAccessProvisioning_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemAccessProvisioning" ADD CONSTRAINT "SystemAccessProvisioning_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorAssignment" ADD CONSTRAINT "MentorAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorAssignment" ADD CONSTRAINT "MentorAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorAssignment" ADD CONSTRAINT "MentorAssignment_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
