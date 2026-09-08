import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditEvent } from "@/lib/audit";
import { createDownloadUrl, createUploadUrl, verifyStoredObject } from "@/lib/storage";
import { AppError, forbiddenError, notFoundError, validationError } from "@/lib/errors";
import { EMPLOYEE_STATUS_TRANSITIONS, type EmployeeStatus } from "@/modules/employees/constants";
import { getOnboarding } from "@/modules/employees/repository";

function idFor(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
function isUnique(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
function assertEmployeeStatusTransition(from: string, to: EmployeeStatus) {
  if (!(EMPLOYEE_STATUS_TRANSITIONS[from as EmployeeStatus] || []).includes(to))
    throw new AppError("CONFLICT", `Employee status cannot transition from ${from} to ${to}`, 409);
}
function progress(
  tasks: Array<{
    id: string;
    status: string;
    definition: { required: boolean };
    dueDate: Date | null;
  }>,
) {
  const now = new Date();
  const normalized = tasks.map((task) => ({
    ...task,
    status:
      task.status !== "COMPLETED" && task.dueDate && task.dueDate < now ? "OVERDUE" : task.status,
  }));
  const completed = normalized.filter((task) => task.status === "COMPLETED").length;
  const overdue = normalized.filter((task) => task.status === "OVERDUE").length;
  const required = normalized.filter((task) => task.definition.required);
  const requiredComplete =
    required.length > 0 && required.every((task) => task.status === "COMPLETED");
  return {
    total: normalized.length,
    completed,
    overdue,
    percent: normalized.length ? Math.round((completed / normalized.length) * 100) : 0,
    requiredComplete,
    tasks: normalized,
  };
}

export async function convertCandidateToEmployee(input: {
  organizationId: string;
  actorUserId: string;
  candidateId: string;
  joiningDate?: string | null;
  probationDurationDays?: number | null;
  templateId?: string;
  requestId?: string;
}) {
  const existing = await db.employee.findFirst({
    where: { organizationId: input.organizationId, candidateId: input.candidateId },
    include: { onboardingInstances: true },
  });
  if (existing) return { employee: existing, created: false };
  try {
    return await db.$transaction(async (tx) => {
      const offer = await tx.offer.findFirst({
        where: {
          organizationId: input.organizationId,
          candidate: { id: input.candidateId },
          status: "ACCEPTED",
        },
        orderBy: { respondedAt: "desc" },
        include: { candidate: true, application: { include: { requisition: true } } },
      });
      const candidate =
        offer?.candidate ||
        (await tx.candidate.findFirst({
          where: {
            id: input.candidateId,
            organizationId: input.organizationId,
            status: "SELECTED",
          },
        }));
      const application =
        offer?.application ||
        (await tx.application.findFirst({
          where: { candidateId: input.candidateId, organizationId: input.organizationId },
          orderBy: { createdAt: "desc" },
          include: { requisition: true },
        }));
      if (!candidate || !application)
        throw new AppError(
          "CONFLICT",
          "A selected candidate with an application is required before onboarding",
          409,
        );
      const joiningDate = input.joiningDate ? new Date(input.joiningDate) : new Date();
      const probationDays = input.probationDurationDays ?? 0;
      const employee = await tx.employee.create({
        data: {
          organizationId: input.organizationId,
          candidateId: candidate.id,
          applicationId: application.id,
          employeeNo: idFor("EMP"),
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
          phone: candidate.phone,
          addressLine1: candidate.addressLine1,
          addressLine2: candidate.addressLine2,
          city: candidate.city,
          state: candidate.state,
          country: candidate.country,
          postalCode: candidate.postalCode,
          jobTitle: application.requisition.title,
          joiningDate,
          probationDurationDays: probationDays || null,
          probationEndDate: probationDays
            ? new Date(joiningDate.getTime() + probationDays * 86400000)
            : null,
          status: probationDays ? "PROBATION" : "ACTIVE",
        },
      });
      await tx.employeeHistory.create({
        data: {
          organizationId: input.organizationId,
          employeeId: employee.id,
          eventType: "CANDIDATE_CONVERTED",
          toValue: employee.status,
          actorUserId: input.actorUserId,
          notes: `Source candidate ${candidate.id}, application ${application.id}${offer ? `, accepted offer ${offer.id}` : ""}`,
        },
      });
      await tx.candidateActivity.create({
        data: {
          organizationId: input.organizationId,
          candidateId: candidate.id,
          actorUserId: input.actorUserId,
          action: "CANDIDATE_CONVERTED_TO_EMPLOYEE",
          metadata: {
            employeeId: employee.id,
            applicationId: application.id,
            offerId: offer?.id || null,
          },
        },
      });
      await writeAuditEvent(tx, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "CANDIDATE_CONVERTED_TO_EMPLOYEE",
        entityType: "Employee",
        entityId: employee.id,
        requestId: input.requestId,
        metadata: {
          candidateId: candidate.id,
          applicationId: application.id,
          offerId: offer?.id || null,
        },
      });
      await createOnboardingInTransaction(tx, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        employeeId: employee.id,
        templateId: input.templateId,
        requestId: input.requestId,
      });
      return { employee, created: true };
    });
  } catch (error) {
    if (isUnique(error)) {
      const employee = await db.employee.findFirst({
        where: { organizationId: input.organizationId, candidateId: input.candidateId },
      });
      if (employee) return { employee, created: false };
    }
    throw error;
  }
}

export async function updateEmployee(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  patch: {
    department?: string | null;
    location?: string | null;
    jobTitle?: string;
    managerEmployeeId?: string | null;
    profileImageUrl?: string | null;
  };
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const current = await tx.employee.findFirst({
      where: { id: input.id, organizationId: input.organizationId },
    });
    if (!current) throw notFoundError();
    if (["EXITED", "INACTIVE"].includes(current.status))
      throw new AppError("CONFLICT", "Exited employee HR-managed fields cannot be changed", 409);
    if (input.patch.managerEmployeeId) {
      const manager = await tx.employee.findFirst({
        where: { id: input.patch.managerEmployeeId, organizationId: input.organizationId },
      });
      if (!manager || manager.id === current.id)
        throw validationError({
          managerEmployeeId: ["Manager must be another employee in the same organization"],
        });
    }
    const updated = await tx.employee.update({ where: { id: current.id }, data: input.patch });
    await tx.employeeHistory.create({
      data: {
        organizationId: input.organizationId,
        employeeId: current.id,
        eventType: "PROFILE_UPDATED",
        actorUserId: input.actorUserId,
        notes: "Employee profile updated",
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "EMPLOYEE_UPDATED",
      entityType: "Employee",
      entityId: current.id,
      requestId: input.requestId,
    });
    return updated;
  });
}

const selfServiceEmployeeSelect = {
  id: true,
  employeeNo: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  country: true,
  postalCode: true,
  profileImageUrl: true,
  jobTitle: true,
  department: true,
  location: true,
  employmentType: true,
  joiningDate: true,
  status: true,
} as const;

async function findSelfServiceEmployee(
  tx: Prisma.TransactionClient | typeof db,
  input: { organizationId: string; userEmail: string },
) {
  const employees = await tx.employee.findMany({
    where: { organizationId: input.organizationId, email: { equals: input.userEmail } },
    select: selfServiceEmployeeSelect,
    take: 2,
  });
  if (employees.length > 1) throw forbiddenError();
  return employees[0] ?? null;
}

export async function getSelfServiceEmployee(input: { organizationId: string; userEmail: string }) {
  return findSelfServiceEmployee(db, input);
}

export async function updateSelfServiceEmployee(input: {
  organizationId: string;
  actorUserId: string;
  userEmail: string;
  patch: {
    phone?: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
    profileImageUrl?: string | null;
  };
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const current = await findSelfServiceEmployee(tx, {
      organizationId: input.organizationId,
      userEmail: input.userEmail,
    });
    if (!current) throw notFoundError();
    const updated = await tx.employee.update({
      where: { id: current.id },
      data: input.patch,
      select: selfServiceEmployeeSelect,
    });
    await tx.employeeHistory.create({
      data: {
        organizationId: input.organizationId,
        employeeId: current.id,
        eventType: "SELF_SERVICE_PROFILE_UPDATED",
        actorUserId: input.actorUserId,
        notes: "Employee self-service profile updated",
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "EMPLOYEE_SELF_SERVICE_UPDATED",
      entityType: "Employee",
      entityId: current.id,
      requestId: input.requestId,
    });
    return updated;
  });
}

export async function changeEmployeeStatus(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  status: EmployeeStatus;
  notes?: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const current = await tx.employee.findFirst({
      where: { id: input.id, organizationId: input.organizationId },
    });
    if (!current) throw notFoundError();
    assertEmployeeStatusTransition(current.status, input.status);
    const updated = await tx.employee.update({
      where: { id: current.id },
      data: {
        status: input.status,
        confirmationDate: input.status === "CONFIRMED" ? new Date() : undefined,
      },
    });
    await tx.employeeHistory.create({
      data: {
        organizationId: input.organizationId,
        employeeId: current.id,
        eventType: "STATUS_CHANGED",
        fromValue: current.status,
        toValue: input.status,
        notes: input.notes,
        actorUserId: input.actorUserId,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "EMPLOYEE_STATUS_CHANGED",
      entityType: "Employee",
      entityId: current.id,
      requestId: input.requestId,
      metadata: { from: current.status, to: input.status },
    });
    return updated;
  });
}

export async function createExitCase(input: {
  organizationId: string;
  actorUserId: string;
  actorEmail?: string;
  allowOrganizationWide?: boolean;
  employeeId: string;
  reason: string;
  noticePeriodDays?: number;
  expectedLastWorkingDay?: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id: input.employeeId, organizationId: input.organizationId },
    });
    if (!employee) throw notFoundError();
    if (!input.allowOrganizationWide) {
      const actorEmployee = input.actorEmail
        ? await tx.employee.findFirst({
            where: { organizationId: input.organizationId, email: { equals: input.actorEmail } },
          })
        : null;
      if (
        !actorEmployee ||
        (actorEmployee.id !== employee.id && employee.managerEmployeeId !== actorEmployee.id)
      )
        throw forbiddenError();
    }
    if (["EXITED", "INACTIVE"].includes(employee.status))
      throw new AppError("CONFLICT", "Employee is already exited or inactive", 409);
    const existing = await tx.exitCase.findUnique({ where: { employeeId: employee.id } });
    if (existing)
      throw new AppError("CONFLICT", "An exit case already exists for this employee", 409);
    const exitCase = await tx.exitCase.create({
      data: {
        organizationId: input.organizationId,
        employeeId: employee.id,
        initiatedByUserId: input.actorUserId,
        reason: input.reason,
        noticePeriodDays: input.noticePeriodDays,
        expectedLastWorkingDay: input.expectedLastWorkingDay
          ? new Date(input.expectedLastWorkingDay)
          : undefined,
      },
    });
    await tx.employeeHistory.create({
      data: {
        organizationId: input.organizationId,
        employeeId: employee.id,
        eventType: "EXIT_INITIATED",
        fromValue: employee.status,
        notes: input.reason,
        actorUserId: input.actorUserId,
      },
    });
    await tx.appNotification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.actorUserId,
        eventType: "EXIT_CASE_CREATED",
        title: "Exit case started",
        body: `${employee.employeeNo}: ${input.reason}`,
        actionableUrl: `/hr/offboarding?organizationId=${input.organizationId}`,
        channels: ["IN_APP"],
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "EXIT_CASE_CREATED",
      entityType: "ExitCase",
      entityId: exitCase.id,
      requestId: input.requestId,
    });
    return exitCase;
  });
}

export async function listExitCases(organizationId: string) {
  return db.exitCase.findMany({
    where: { organizationId },
    orderBy: { requestedAt: "desc" },
    include: {
      employee: {
        select: {
          id: true,
          employeeNo: true,
          firstName: true,
          lastName: true,
          status: true,
          assets: true,
        },
      },
      clearanceTasks: true,
      interview: true,
      settlement: true,
    },
  });
}
export async function getExitCase(organizationId: string, id: string) {
  const item = await db.exitCase.findFirst({
    where: { id, organizationId },
    include: {
      employee: {
        include: {
          assets: true,
          accessProvisioning: true,
          history: { orderBy: { effectiveDate: "desc" } },
        },
      },
      clearanceTasks: true,
      interview: true,
      settlement: true,
    },
  });
  if (!item) throw notFoundError();
  return item;
}
export async function listExitDocuments(organizationId: string, exitCaseId: string) {
  const item = await db.exitCase.findFirst({ where: { id: exitCaseId, organizationId } });
  if (!item) throw notFoundError();
  return db.managedDocument.findMany({
    where: {
      organizationId,
      ownerType: "EMPLOYEE",
      ownerId: item.employeeId,
      documentType: { startsWith: "EXIT_" },
      deletedAt: null,
    },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });
}
export async function attachExitDocument(input: {
  organizationId: string;
  actorUserId: string;
  exitCaseId: string;
  documentId: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const item = await tx.exitCase.findFirst({
      where: { id: input.exitCaseId, organizationId: input.organizationId },
    });
    if (!item) throw notFoundError();
    const document = await tx.managedDocument.findFirst({
      where: {
        id: input.documentId,
        organizationId: input.organizationId,
        ownerType: "EMPLOYEE",
        ownerId: item.employeeId,
        status: "ACTIVE",
        deletedAt: null,
      },
    });
    if (!document) throw notFoundError();
    const updated = await tx.managedDocument.update({
      where: { id: document.id },
      data: {
        documentType: document.documentType.startsWith("EXIT_")
          ? document.documentType
          : `EXIT_${document.documentType}`,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "EXIT_DOCUMENT_ATTACHED",
      entityType: "ManagedDocument",
      entityId: document.id,
      requestId: input.requestId,
      metadata: { exitCaseId: item.id },
    });
    return updated;
  });
}
export async function addExitTask(input: {
  organizationId: string;
  actorUserId: string;
  exitCaseId: string;
  department: string;
  title: string;
  dueAt?: string;
  assignedToUserId?: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const item = await tx.exitCase.findFirst({
      where: { id: input.exitCaseId, organizationId: input.organizationId },
    });
    if (!item) throw notFoundError();
    if (
      input.assignedToUserId &&
      !(await tx.membership.findFirst({
        where: {
          organizationId: input.organizationId,
          userId: input.assignedToUserId,
          status: "ACTIVE",
        },
      }))
    )
      throw validationError({
        assignedToUserId: ["Assignee must be an active organization member"],
      });
    const dueAt = input.dueAt ? new Date(input.dueAt) : undefined;
    const task = await tx.exitClearanceTask.create({
      data: {
        organizationId: input.organizationId,
        exitCaseId: item.id,
        department: input.department,
        title: input.title,
        dueAt,
        assignedToUserId: input.assignedToUserId,
      },
    });
    if (input.assignedToUserId) {
      await tx.appNotification.create({
        data: {
          organizationId: input.organizationId,
          userId: input.assignedToUserId,
          eventType: "EXIT_CLEARANCE_ASSIGNED",
          title: "Exit clearance task assigned",
          body: input.title,
          actionableUrl: `/hr/offboarding?organizationId=${input.organizationId}`,
          channels: ["IN_APP"],
        },
      });
      await tx.workflowTask.create({
        data: {
          organizationId: input.organizationId,
          assignedToUserId: input.assignedToUserId,
          sourceType: "EXIT_CLEARANCE",
          sourceId: task.id,
          title: input.title,
          dueAt,
        },
      });
      if (dueAt)
        await tx.reminder.create({
          data: {
            organizationId: input.organizationId,
            userId: input.assignedToUserId,
            sourceType: "EXIT_CLEARANCE",
            sourceId: task.id,
            title: input.title,
            dueAt,
          },
        });
    }
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "EXIT_CLEARANCE_TASK_CREATED",
      entityType: "ExitClearanceTask",
      entityId: task.id,
      requestId: input.requestId,
    });
    return task;
  });
}
export async function updateExitTask(input: {
  organizationId: string;
  actorUserId: string;
  allowOverride?: boolean;
  taskId: string;
  status: string;
  notes?: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const current = await tx.exitClearanceTask.findFirst({
      where: { id: input.taskId, organizationId: input.organizationId },
    });
    if (!current) throw notFoundError();
    if (current.assignedToUserId !== input.actorUserId && !input.allowOverride)
      throw forbiddenError();
    if (current.status !== "OPEN" || !["COMPLETED", "REJECTED"].includes(input.status))
      throw new AppError(
        "CONFLICT",
        `Clearance task cannot transition from ${current.status} to ${input.status}`,
        409,
      );
    const completedAt = new Date();
    const task = await tx.exitClearanceTask.update({
      where: { id: current.id },
      data: {
        status: input.status,
        notes: input.notes,
        completedAt,
        completedByUserId: input.actorUserId,
      },
    });
    await tx.workflowTask.updateMany({
      where: {
        organizationId: input.organizationId,
        sourceType: "EXIT_CLEARANCE",
        sourceId: task.id,
        status: "OPEN",
      },
      data: { status: input.status, completedAt, completedByUserId: input.actorUserId },
    });
    await tx.reminder.updateMany({
      where: {
        organizationId: input.organizationId,
        sourceType: "EXIT_CLEARANCE",
        sourceId: task.id,
        status: "PENDING",
      },
      data: { status: "COMPLETED" },
    });
    await tx.appNotification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.actorUserId,
        eventType: "EXIT_CLEARANCE_UPDATED",
        title: "Exit clearance task updated",
        body: `${task.title}: ${task.status}`,
        actionableUrl: `/hr/offboarding?organizationId=${input.organizationId}`,
        channels: ["IN_APP"],
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "EXIT_CLEARANCE_TASK_UPDATED",
      entityType: "ExitClearanceTask",
      entityId: task.id,
      requestId: input.requestId,
      metadata: { from: current.status, to: input.status },
    });
    return task;
  });
}
export async function saveExitInterview(input: {
  organizationId: string;
  actorUserId: string;
  exitCaseId: string;
  feedback: Record<string, string>;
  rating?: number;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const item = await tx.exitCase.findFirst({
      where: { id: input.exitCaseId, organizationId: input.organizationId },
    });
    if (!item) throw notFoundError();
    const interview = await tx.exitInterview.upsert({
      where: { exitCaseId: item.id },
      create: {
        organizationId: input.organizationId,
        exitCaseId: item.id,
        feedback: input.feedback,
        rating: input.rating,
        createdByUserId: input.actorUserId,
      },
      update: {
        feedback: input.feedback,
        rating: input.rating,
        createdByUserId: input.actorUserId,
      },
    });
    await tx.appNotification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.actorUserId,
        eventType: "EXIT_INTERVIEW_RECORDED",
        title: "Exit interview recorded",
        body: "Structured exit feedback was saved",
        actionableUrl: `/hr/offboarding?organizationId=${input.organizationId}`,
        channels: ["IN_APP"],
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "EXIT_INTERVIEW_RECORDED",
      entityType: "ExitInterview",
      entityId: interview.id,
      requestId: input.requestId,
    });
    return interview;
  });
}
export async function updateExitSettlement(input: {
  organizationId: string;
  actorUserId: string;
  exitCaseId: string;
  status: string;
  notes?: string;
  amount?: number;
  requestId?: string;
}) {
  try {
    return await db.$transaction(
      async (tx) => {
        const item = await tx.exitCase.findFirst({
          where: { id: input.exitCaseId, organizationId: input.organizationId },
          include: { settlement: true },
        });
        if (!item) throw notFoundError();
        const current = item.settlement?.status ?? "PENDING";
        const allowed: Record<string, string[]> = {
          PENDING: ["READY"],
          READY: ["COMPLETED"],
          COMPLETED: [],
        };
        if (!allowed[current]?.includes(input.status))
          throw new AppError(
            "CONFLICT",
            `Settlement cannot transition from ${current} to ${input.status}`,
            409,
          );
        const settlement = await tx.exitSettlement.upsert({
          where: { exitCaseId: item.id },
          create: {
            organizationId: input.organizationId,
            exitCaseId: item.id,
            status: input.status,
            notes: input.notes,
            amount: input.amount,
            actedByUserId: input.actorUserId,
          },
          update: {
            status: input.status,
            notes: input.notes,
            amount: input.amount,
            actedByUserId: input.actorUserId,
          },
        });
        await tx.appNotification.create({
          data: {
            organizationId: input.organizationId,
            userId: input.actorUserId,
            eventType: "EXIT_SETTLEMENT_UPDATED",
            title: "Final settlement updated",
            body: `Settlement is ${settlement.status}`,
            actionableUrl: `/hr/offboarding?organizationId=${input.organizationId}`,
            channels: ["IN_APP"],
          },
        });
        await writeAuditEvent(tx, {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: "EXIT_SETTLEMENT_UPDATED",
          entityType: "ExitSettlement",
          entityId: settlement.id,
          requestId: input.requestId,
          metadata: { from: current, to: input.status },
        });
        return settlement;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      throw new AppError("CONFLICT", "Settlement changed concurrently", 409);
    throw error;
  }
}
export async function returnAsset(input: {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
  assetId: string;
  notes?: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const asset = await tx.onboardingAsset.findFirst({
      where: {
        id: input.assetId,
        organizationId: input.organizationId,
        employeeId: input.employeeId,
      },
    });
    if (!asset) throw notFoundError();
    if (asset.status === "RETURNED")
      throw new AppError("CONFLICT", "Asset is already returned", 409);
    const updated = await tx.onboardingAsset.update({
      where: { id: asset.id },
      data: { status: "RETURNED", returnedAt: new Date(), notes: input.notes },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "EXIT_ASSET_RETURNED",
      entityType: "OnboardingAsset",
      entityId: asset.id,
      requestId: input.requestId,
    });
    return updated;
  });
}

export async function completeExitCase(input: {
  organizationId: string;
  actorUserId: string;
  exitCaseId: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const item = await tx.exitCase.findFirst({
      where: { id: input.exitCaseId, organizationId: input.organizationId },
      include: { employee: true, clearanceTasks: true, settlement: true, interview: true },
    });
    if (!item) throw notFoundError();
    if (item.status === "COMPLETED") return item;
    if (
      !item.clearanceTasks.length ||
      item.clearanceTasks.some((task) => task.status !== "COMPLETED")
    )
      throw new AppError("CONFLICT", "All clearance tasks must be completed", 409);
    if (!item.interview) throw new AppError("CONFLICT", "Exit interview must be recorded", 409);
    if (!item.settlement || item.settlement.status !== "COMPLETED")
      throw new AppError("CONFLICT", "Final settlement must be completed", 409);
    const outstandingAssets = await tx.onboardingAsset.count({
      where: {
        organizationId: input.organizationId,
        employeeId: item.employeeId,
        status: "ASSIGNED",
      },
    });
    if (outstandingAssets)
      throw new AppError("CONFLICT", "All assigned assets must be returned", 409);
    const accesses = await tx.systemAccessProvisioning.findMany({
      where: {
        organizationId: input.organizationId,
        employeeId: item.employeeId,
        status: { not: "REVOKED" },
      },
    });
    const updated = await tx.exitCase.update({
      where: { id: item.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await tx.systemAccessProvisioning.updateMany({
      where: { id: { in: accesses.map((access) => access.id) } },
      data: { status: "REVOKED", notes: "Revoked during completed offboarding" },
    });
    for (const access of accesses)
      await writeAuditEvent(tx, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "SYSTEM_ACCESS_REVOKED",
        entityType: "SystemAccessProvisioning",
        entityId: access.id,
        requestId: input.requestId,
        metadata: { exitCaseId: item.id, systemName: access.systemName },
      });
    await tx.employee.update({ where: { id: item.employeeId }, data: { status: "EXITED" } });
    await tx.employeeHistory.create({
      data: {
        organizationId: input.organizationId,
        employeeId: item.employeeId,
        eventType: "EMPLOYEE_EXITED",
        fromValue: item.employee.status,
        toValue: "EXITED",
        actorUserId: input.actorUserId,
      },
    });
    await tx.appNotification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.actorUserId,
        eventType: "EMPLOYEE_EXIT_COMPLETED",
        title: "Employee exit completed",
        body: `${item.employee.employeeNo} is now EXITED`,
        actionableUrl: `/hr/offboarding?organizationId=${input.organizationId}`,
        channels: ["IN_APP"],
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "EMPLOYEE_EXIT_COMPLETED",
      entityType: "ExitCase",
      entityId: item.id,
      requestId: input.requestId,
    });
    return updated;
  });
}

const DEFAULT_ONBOARDING_TASKS = [
  {
    title: "Complete employee information and required forms",
    description: "Review personal details, employment terms, and required HR paperwork.",
    category: "PRE_JOINING",
    dueDays: 0,
    required: true,
    sortOrder: 1,
  },
  {
    title: "Verify identity and employment documents",
    description: "Collect and verify the documents required for this employee and location.",
    category: "COMPLIANCE",
    dueDays: 3,
    required: true,
    sortOrder: 2,
  },
  {
    title: "Prepare workstation and system access",
    description: "Confirm equipment, email, collaboration tools, and role-based access are ready.",
    category: "DAY_ONE",
    dueDays: 0,
    required: true,
    sortOrder: 3,
  },
  {
    title: "Complete company orientation",
    description: "Introduce the mission, values, policies, safety guidance, and ways of working.",
    category: "DAY_ONE",
    dueDays: 1,
    required: true,
    sortOrder: 4,
  },
  {
    title: "Meet manager, team, and onboarding buddy",
    description: "Schedule the key introductions and agree on the first-week support plan.",
    category: "CONNECTION",
    dueDays: 2,
    required: false,
    sortOrder: 5,
  },
  {
    title: "Complete role-specific training plan",
    description: "Review role expectations, tools, workflows, and initial learning goals.",
    category: "ROLE",
    dueDays: 14,
    required: true,
    sortOrder: 6,
  },
  {
    title: "30-day check-in",
    description: "Review progress, blockers, feedback, and priorities with the manager.",
    category: "MILESTONE",
    dueDays: 30,
    required: false,
    sortOrder: 7,
  },
  {
    title: "60-day check-in",
    description: "Review capability growth, relationships, and updated development goals.",
    category: "MILESTONE",
    dueDays: 60,
    required: false,
    sortOrder: 8,
  },
  {
    title: "90-day review and onboarding feedback",
    description:
      "Confirm role clarity, gather employee feedback, and agree on the next development goals.",
    category: "MILESTONE",
    dueDays: 90,
    required: true,
    sortOrder: 9,
  },
  {
    title: "Record first attendance",
    description:
      "This task is completed automatically when the employee records their first attendance.",
    category: "ATTENDANCE",
    dueDays: 0,
    required: true,
    sortOrder: 10,
  },
] as const;

async function ensureDefaultOnboardingTemplate(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; actorUserId: string },
) {
  const existing = await tx.onboardingTemplate.findFirst({
    where: { organizationId: input.organizationId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    include: { definitions: true },
  });
  if (existing) return existing;
  return tx.onboardingTemplate.create({
    data: {
      organizationId: input.organizationId,
      name: "Standard employee onboarding",
      department: null,
      role: null,
      employmentType: null,
      createdByUserId: input.actorUserId,
      definitions: { create: DEFAULT_ONBOARDING_TASKS.map((task) => ({ ...task })) },
    },
    include: { definitions: true },
  });
}

async function createOnboardingInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    actorUserId: string;
    employeeId: string;
    templateId?: string;
    requestId?: string;
  },
) {
  const employee = await tx.employee.findFirst({
    where: { id: input.employeeId, organizationId: input.organizationId },
  });
  const template = input.templateId
    ? await tx.onboardingTemplate.findFirst({
        where: { id: input.templateId, organizationId: input.organizationId, status: "ACTIVE" },
        include: { definitions: true },
      })
    : await ensureDefaultOnboardingTemplate(tx, input);
  if (!employee || !template) throw notFoundError();
  const instance = await tx.onboardingInstance.create({
    data: {
      organizationId: input.organizationId,
      employeeId: employee.id,
      templateId: template.id,
      tasks: {
        create: template.definitions.map((definition) => ({
          organizationId: input.organizationId,
          definitionId: definition.id,
          dueDate:
            definition.dueDays == null
              ? null
              : new Date(employee.joiningDate.getTime() + definition.dueDays * 86400000),
        })),
      },
    },
    include: { tasks: true },
  });
  await tx.appNotification.create({
    data: {
      organizationId: input.organizationId,
      userId: input.actorUserId,
      eventType: "ONBOARDING_CREATED",
      title: "Onboarding plan created",
      body: `${employee.employeeNo} is ready for onboarding`,
      actionableUrl: `/hr/onboarding/${instance.id}`,
      channels: ["IN_APP"],
    },
  });
  await writeAuditEvent(tx, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "ONBOARDING_CREATED",
    entityType: "OnboardingInstance",
    entityId: instance.id,
    requestId: input.requestId,
    metadata: { employeeId: employee.id, templateId: template.id },
  });
  return instance;
}

export async function createTemplate(input: {
  organizationId: string;
  actorUserId: string;
  name: string;
  department?: string | null;
  role?: string | null;
  employmentType?: string | null;
  definitions: Array<{
    title: string;
    description?: string;
    category?: string;
    dueDays?: number;
    required: boolean;
    sortOrder: number;
  }>;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const template = await tx.onboardingTemplate.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        department: input.department,
        role: input.role,
        employmentType: input.employmentType,
        createdByUserId: input.actorUserId,
        definitions: { create: input.definitions },
      },
      include: { definitions: true },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "ONBOARDING_TEMPLATE_CREATED",
      entityType: "OnboardingTemplate",
      entityId: template.id,
      requestId: input.requestId,
    });
    return template;
  });
}
export async function createOnboarding(input: {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
  templateId?: string;
  requestId?: string;
}) {
  try {
    return await db.$transaction((tx) => createOnboardingInTransaction(tx, input));
  } catch (error) {
    if (isUnique(error))
      throw new AppError(
        "CONFLICT",
        "This onboarding template is already assigned to the employee",
        409,
      );
    throw error;
  }
}
export async function getOnboardingProgress(organizationId: string, id: string) {
  const onboarding = await getOnboarding(organizationId, id);
  if (!onboarding) throw notFoundError();
  const result = progress(onboarding.tasks);
  const statusById = new Map(result.tasks.map((task) => [task.id, task.status]));
  return {
    ...onboarding,
    tasks: onboarding.tasks.map((task) => ({
      ...task,
      status: statusById.get(task.id) ?? task.status,
    })),
    progress: {
      total: result.total,
      completed: result.completed,
      overdue: result.overdue,
      percent: result.percent,
      requiredComplete: result.requiredComplete,
    },
  };
}
export async function completeTask(input: {
  organizationId: string;
  actorUserId: string;
  onboardingId: string;
  taskId: string;
  notes?: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const task = await tx.onboardingTask.findFirst({
      where: {
        id: input.taskId,
        onboardingId: input.onboardingId,
        organizationId: input.organizationId,
      },
      include: { definition: true, onboarding: { include: { employee: true } } },
    });
    if (!task) throw notFoundError();
    if (task.status === "COMPLETED") return task;
    const updated = await tx.onboardingTask.update({
      where: { id: task.id },
      data: {
        status: "COMPLETED",
        notes: input.notes,
        completedAt: new Date(),
        completedByUserId: input.actorUserId,
      },
    });
    const tasks = await tx.onboardingTask.findMany({
      where: { onboardingId: input.onboardingId, organizationId: input.organizationId },
      include: { definition: true },
    });
    const requiredTasks = tasks.filter((item) => item.definition.required);
    const requiredComplete =
      requiredTasks.length > 0 &&
      requiredTasks.every((item) => item.id === task.id || item.status === "COMPLETED");
    await tx.onboardingInstance.update({
      where: { id: input.onboardingId },
      data: {
        status: requiredComplete ? "COMPLETED" : "IN_PROGRESS",
        startedAt: new Date(),
        completedAt: requiredComplete ? new Date() : null,
      },
    });
    await tx.appNotification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.actorUserId,
        eventType: "ONBOARDING_TASK_COMPLETED",
        title: "Onboarding task completed",
        body: `${task.onboarding.employee.employeeNo}: ${task.definition.title}`,
        actionableUrl: `/hr/onboarding/${input.onboardingId}`,
        channels: ["IN_APP"],
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "ONBOARDING_TASK_COMPLETED",
      entityType: "OnboardingTask",
      entityId: task.id,
      requestId: input.requestId,
      metadata: { onboardingId: input.onboardingId },
    });
    return updated;
  });
}

/** Completes the attendance onboarding task when the employee's first attendance is recorded. */
export async function completeAttendanceOnboardingTask(input: {
  tx: Prisma.TransactionClient;
  organizationId: string;
  employeeId: string;
  actorUserId: string;
  requestId?: string;
}) {
  const onboarding = await input.tx.onboardingInstance.findFirst({
    where: {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      status: { not: "COMPLETED" },
    },
    orderBy: { createdAt: "desc" },
    include: {
      employee: true,
      template: { include: { definitions: true } },
      tasks: { include: { definition: true } },
    },
  });
  if (!onboarding) return null;
  let task = onboarding.tasks.find(
    (item) => item.definition.category === "ATTENDANCE" && item.status !== "COMPLETED",
  );
  if (!task && onboarding.template.name === "Standard employee onboarding") {
    let definition = onboarding.template.definitions.find((item) => item.category === "ATTENDANCE");
    if (!definition)
      definition = await input.tx.onboardingTaskDefinition.create({
        data: {
          templateId: onboarding.templateId,
          title: "Record first attendance",
          description:
            "This task is completed automatically when the employee records their first attendance.",
          category: "ATTENDANCE",
          dueDays: 0,
          required: true,
          sortOrder: 10,
        },
      });
    task = await input.tx.onboardingTask.create({
      data: {
        organizationId: input.organizationId,
        onboardingId: onboarding.id,
        definitionId: definition.id,
      },
      include: { definition: true },
    });
  }
  if (!task) return null;

  const completedAt = new Date();
  const updated = await input.tx.onboardingTask.update({
    where: { id: task.id },
    data: {
      status: "COMPLETED",
      completedAt,
      completedByUserId: input.actorUserId,
      notes: "Completed automatically from the employee's first attendance.",
    },
  });
  const requiredTasks = onboarding.tasks.filter((item) => item.definition.required);
  const requiredComplete = requiredTasks.every(
    (item) => item.id === task.id || item.status === "COMPLETED",
  );
  await input.tx.onboardingInstance.update({
    where: { id: onboarding.id },
    data: {
      status: requiredComplete ? "COMPLETED" : "IN_PROGRESS",
      startedAt: onboarding.startedAt ?? completedAt,
      completedAt: requiredComplete ? completedAt : null,
    },
  });
  await input.tx.appNotification.create({
    data: {
      organizationId: input.organizationId,
      userId: input.actorUserId,
      eventType: "ONBOARDING_TASK_COMPLETED",
      title: "Attendance task completed",
      body: `${onboarding.employee.employeeNo} recorded first attendance`,
      actionableUrl: `/hr/onboarding/${onboarding.id}`,
      channels: ["IN_APP"],
    },
  });
  await writeAuditEvent(input.tx, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "ONBOARDING_ATTENDANCE_TASK_COMPLETED",
    entityType: "OnboardingTask",
    entityId: updated.id,
    requestId: input.requestId,
    metadata: { onboardingId: onboarding.id, employeeId: input.employeeId },
  });
  return updated;
}
export async function createDocument(input: {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
  onboardingId?: string | null;
  kind: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  requestId?: string;
}) {
  if (!input.objectKey.startsWith(`employees/${input.organizationId}/`))
    throw validationError({ objectKey: ["Document key is not scoped to this organization"] });
  await verifyStoredObject(input.objectKey, input.contentType, input.byteSize);
  return db.$transaction(async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id: input.employeeId, organizationId: input.organizationId },
    });
    if (!employee) throw notFoundError();
    const document = await tx.onboardingDocument.create({
      data: {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        onboardingId: input.onboardingId,
        kind: input.kind,
        objectKey: input.objectKey,
        fileName: input.fileName,
        contentType: input.contentType,
        byteSize: input.byteSize,
        status: "UPLOADED",
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "ONBOARDING_DOCUMENT_UPLOADED",
      entityType: "OnboardingDocument",
      entityId: document.id,
      requestId: input.requestId,
    });
    return document;
  });
}
export async function createDocumentRequest(input: {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
  onboardingId?: string | null;
  kind: string;
  fileName?: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id: input.employeeId, organizationId: input.organizationId },
    });
    if (!employee) throw notFoundError();
    const document = await tx.onboardingDocument.create({
      data: {
        organizationId: input.organizationId,
        employeeId: employee.id,
        onboardingId: input.onboardingId,
        kind: input.kind,
        objectKey: `pending/${input.organizationId}/${employee.id}/${crypto.randomUUID()}`,
        fileName: input.fileName || `${input.kind} (requested)`,
        contentType: "application/octet-stream",
        byteSize: 0,
        status: "REQUESTED",
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "ONBOARDING_DOCUMENT_REQUESTED",
      entityType: "OnboardingDocument",
      entityId: document.id,
      requestId: input.requestId,
      metadata: { employeeId: employee.id, kind: input.kind },
    });
    return document;
  });
}
export async function listSelfServiceDocuments(input: {
  organizationId: string;
  userEmail: string;
}) {
  const employee = await findSelfServiceEmployee(db, input);
  if (!employee) throw notFoundError();
  return db.onboardingDocument.findMany({
    where: { organizationId: input.organizationId, employeeId: employee.id },
    select: {
      id: true,
      onboardingId: true,
      kind: true,
      fileName: true,
      contentType: true,
      byteSize: true,
      status: true,
      acknowledged: true,
      verifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
export async function createSelfServiceDocumentUploadUrl(input: {
  organizationId: string;
  userEmail: string;
  id: string;
  fileName: string;
  contentType: string;
  byteSize: number;
}) {
  const employee = await findSelfServiceEmployee(db, input);
  if (!employee) throw notFoundError();
  const document = await db.onboardingDocument.findFirst({
    where: { id: input.id, organizationId: input.organizationId, employeeId: employee.id },
  });
  if (!document) throw notFoundError();
  if (!["REQUESTED", "REJECTED"].includes(document.status))
    throw new AppError(
      "CONFLICT",
      "This document request cannot accept a submission in its current state",
      409,
    );
  const objectKey = `employees/${input.organizationId}/${employee.id}/documents/${crypto.randomUUID()}-${input.fileName}`;
  return {
    objectKey,
    uploadUrl: await createUploadUrl(objectKey, input.contentType),
    fileName: input.fileName,
    contentType: input.contentType,
    byteSize: input.byteSize,
  };
}
export async function submitDocumentRequest(input: {
  organizationId: string;
  actorUserId: string;
  userEmail: string;
  id: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  requestId?: string;
}) {
  if (!input.objectKey.startsWith(`employees/${input.organizationId}/`))
    throw validationError({ objectKey: ["Document key is not scoped to this organization"] });
  await verifyStoredObject(input.objectKey, input.contentType, input.byteSize);
  return db.$transaction(async (tx) => {
    const employee = await findSelfServiceEmployee(tx, {
      organizationId: input.organizationId,
      userEmail: input.userEmail,
    });
    if (!employee) throw notFoundError();
    const document = await tx.onboardingDocument.findFirst({
      where: { id: input.id, organizationId: input.organizationId, employeeId: employee.id },
    });
    if (!document) throw notFoundError();
    if (!["REQUESTED", "REJECTED"].includes(document.status))
      throw new AppError(
        "CONFLICT",
        "This document request cannot be submitted in its current state",
        409,
      );
    const updated = await tx.onboardingDocument.update({
      where: { id: document.id },
      data: {
        objectKey: input.objectKey,
        fileName: input.fileName,
        contentType: input.contentType,
        byteSize: input.byteSize,
        status: "UPLOADED",
        acknowledged: false,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "ONBOARDING_DOCUMENT_SUBMITTED",
      entityType: "OnboardingDocument",
      entityId: document.id,
      requestId: input.requestId,
    });
    return updated;
  });
}
export async function changeDocumentStatus(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  employeeId?: string;
  status: string;
  acknowledged?: boolean;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const document = await tx.onboardingDocument.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
        ...(input.employeeId ? { employeeId: input.employeeId } : {}),
      },
    });
    if (!document) throw notFoundError();
    const allowed =
      document.status === "UPLOADED" && ["VERIFIED", "REJECTED"].includes(input.status);
    if (!allowed)
      throw new AppError(
        "CONFLICT",
        `Document cannot transition from ${document.status} to ${input.status}`,
        409,
      );
    const updated = await tx.onboardingDocument.update({
      where: { id: document.id },
      data: {
        status: input.status,
        acknowledged: input.acknowledged,
        verifiedById: input.status === "VERIFIED" ? input.actorUserId : undefined,
        verifiedAt: input.status === "VERIFIED" ? new Date() : undefined,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action:
        input.status === "VERIFIED"
          ? "ONBOARDING_DOCUMENT_VERIFIED"
          : "ONBOARDING_DOCUMENT_STATUS_CHANGED",
      entityType: "OnboardingDocument",
      entityId: document.id,
      requestId: input.requestId,
      metadata: { status: input.status },
    });
    return updated;
  });
}
export async function getDocumentUrl(input: {
  organizationId: string;
  actorUserId: string;
  employeeId?: string;
  id: string;
  requestId?: string;
}) {
  const document = await db.onboardingDocument.findFirst({
    where: {
      id: input.id,
      organizationId: input.organizationId,
      ...(input.employeeId ? { employeeId: input.employeeId } : {}),
    },
  });
  if (!document) throw notFoundError();
  const url = await createDownloadUrl(document.objectKey);
  await db.$transaction((tx) =>
    writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "ONBOARDING_DOCUMENT_DOWNLOADED",
      entityType: "OnboardingDocument",
      entityId: document.id,
      requestId: input.requestId,
    }),
  );
  return { url };
}
export async function assignAsset(input: {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
  assetType: string;
  identifier: string;
  notes?: string;
  requestId?: string;
}) {
  try {
    return await db.$transaction(async (tx) => {
      const employee = await tx.employee.findFirst({
        where: { id: input.employeeId, organizationId: input.organizationId },
      });
      if (!employee) throw notFoundError();
      const asset = await tx.onboardingAsset.create({
        data: {
          organizationId: input.organizationId,
          employeeId: input.employeeId,
          assetType: input.assetType,
          identifier: input.identifier,
          notes: input.notes,
        },
      });
      await writeAuditEvent(tx, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "ONBOARDING_ASSET_ASSIGNED",
        entityType: "OnboardingAsset",
        entityId: asset.id,
        requestId: input.requestId,
      });
      return asset;
    });
  } catch (error) {
    if (isUnique(error))
      throw new AppError("CONFLICT", "This asset is already assigned in the organization", 409);
    throw error;
  }
}
export async function provisionAccess(input: {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
  systemName: string;
  notes?: string;
  requestId?: string;
}) {
  try {
    return await db.$transaction(async (tx) => {
      const employee = await tx.employee.findFirst({
        where: { id: input.employeeId, organizationId: input.organizationId },
      });
      if (!employee) throw notFoundError();
      const access = await tx.systemAccessProvisioning.create({
        data: {
          organizationId: input.organizationId,
          employeeId: input.employeeId,
          systemName: input.systemName,
          notes: input.notes,
        },
      });
      await writeAuditEvent(tx, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "SYSTEM_ACCESS_REQUESTED",
        entityType: "SystemAccessProvisioning",
        entityId: access.id,
        requestId: input.requestId,
      });
      return access;
    });
  } catch (error) {
    if (isUnique(error))
      throw new AppError("CONFLICT", "Access provisioning already exists for this system", 409);
    throw error;
  }
}
export async function changeAccessStatus(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  status: string;
  notes?: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const current = await tx.systemAccessProvisioning.findFirst({
      where: { id: input.id, organizationId: input.organizationId },
    });
    if (!current) throw notFoundError();
    const updated = await tx.systemAccessProvisioning.update({
      where: { id: current.id },
      data: {
        status: input.status,
        notes: input.notes,
        provisionedAt: input.status === "PROVISIONED" ? new Date() : undefined,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "SYSTEM_ACCESS_STATUS_CHANGED",
      entityType: "SystemAccessProvisioning",
      entityId: current.id,
      requestId: input.requestId,
      metadata: { from: current.status, to: input.status },
    });
    return updated;
  });
}
export async function assignMentor(input: {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
  mentorId: string;
  notes?: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    if (input.employeeId === input.mentorId)
      throw validationError({ mentorId: ["An employee cannot mentor themself"] });
    const [employee, mentor] = await Promise.all([
      tx.employee.findFirst({
        where: { id: input.employeeId, organizationId: input.organizationId },
      }),
      tx.employee.findFirst({
        where: { id: input.mentorId, organizationId: input.organizationId },
      }),
    ]);
    if (!employee || !mentor) throw notFoundError();
    await tx.mentorAssignment.updateMany({
      where: { organizationId: input.organizationId, employeeId: employee.id, endedAt: null },
      data: { endedAt: new Date() },
    });
    const assignment = await tx.mentorAssignment.create({
      data: {
        organizationId: input.organizationId,
        employeeId: employee.id,
        mentorId: mentor.id,
        notes: input.notes,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "MENTOR_ASSIGNED",
      entityType: "MentorAssignment",
      entityId: assignment.id,
      requestId: input.requestId,
      metadata: { employeeId: employee.id, mentorId: mentor.id },
    });
    return assignment;
  });
}
