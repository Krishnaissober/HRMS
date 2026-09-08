import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditEvent } from "@/lib/audit";
import { createDownloadUrl, createUploadUrl, verifyStoredObject } from "@/lib/storage";
import { AppError, forbiddenError, notFoundError, validationError } from "@/lib/errors";
import {
  calendarRange,
  isWeeklyOff,
  isoDate,
  type CalendarView,
} from "@/modules/employee-attendance/rules";
import {
  leaveRequestInclude,
  leaveWhere,
  listLeaveBalances,
  listLeaveRequests,
} from "@/modules/leave/repository";

const decimal = (value: number | string | Prisma.Decimal) => new Prisma.Decimal(value);
const number = (value: Prisma.Decimal | number | string | null | undefined) =>
  value == null ? 0 : Number(value);
const remaining = (balance: {
  allocatedDays: Prisma.Decimal;
  carriedDays: Prisma.Decimal;
  usedDays: Prisma.Decimal;
}) => number(balance.allocatedDays) + number(balance.carriedDays) - number(balance.usedDays);
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function selfEmployee(
  tx: Prisma.TransactionClient | typeof db,
  organizationId: string,
  email: string,
) {
  const employees = await tx.employee.findMany({
    where: { organizationId, email: { equals: email } },
    take: 2,
  });
  if (employees.length > 1) throw forbiddenError();
  if (!employees[0]) throw notFoundError();
  return employees[0];
}

function assertEligibility(
  employee: { status: string; employmentType: string | null; department: string | null },
  eligibility: Prisma.JsonValue | null,
) {
  if (!eligibility || typeof eligibility !== "object" || Array.isArray(eligibility)) return;
  const policy = eligibility as {
    statuses?: string[];
    employmentTypes?: string[];
    departments?: string[];
  };
  if (policy.statuses?.length && !policy.statuses.includes(employee.status))
    throw new AppError("CONFLICT", "The employee is not eligible for this leave type", 409);
  if (
    policy.employmentTypes?.length &&
    (!employee.employmentType || !policy.employmentTypes.includes(employee.employmentType))
  )
    throw new AppError("CONFLICT", "The employee is not eligible for this leave type", 409);
  if (
    policy.departments?.length &&
    (!employee.department || !policy.departments.includes(employee.department))
  )
    throw new AppError("CONFLICT", "The employee is not eligible for this leave type", 409);
}

async function chargeableDates(
  tx: Prisma.TransactionClient,
  organizationId: string,
  employeeId: string,
  start: Date,
  end: Date,
) {
  const [holidays, assignments] = await Promise.all([
    tx.holiday.findMany({
      where: { organizationId, active: true, holidayDate: { gte: start, lte: end } },
    }),
    tx.employeeShiftAssignment.findMany({
      where: {
        organizationId,
        employeeId,
        active: true,
        startDate: { lte: end },
        OR: [{ endDate: null }, { endDate: { gte: start } }],
      },
      include: { shift: true },
      orderBy: { startDate: "desc" },
    }),
  ]);
  const holidayDates = new Set(holidays.map((item) => isoDate(item.holidayDate)));
  const result: Date[] = [];
  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor = new Date(cursor.getTime() + 86400000)
  ) {
    const assignment = assignments.find(
      (item) => item.startDate <= cursor && (!item.endDate || item.endDate >= cursor),
    );
    if (holidayDates.has(isoDate(cursor))) continue;
    if (assignment && isWeeklyOff(cursor, assignment.weeklyOffs, assignment.shift.weeklyOffs))
      continue;
    result.push(new Date(cursor));
  }
  return result;
}

async function persistNotification(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    leaveRequestId: string;
    email: string;
    type: string;
    title: string;
    body: string;
  },
) {
  const user = await tx.user.findUnique({ where: { email: input.email }, select: { id: true } });
  return tx.leaveNotification.create({
    data: {
      organizationId: input.organizationId,
      leaveRequestId: input.leaveRequestId,
      userId: user?.id,
      recipientEmail: input.email,
      type: input.type,
      title: input.title,
      body: input.body,
    },
  });
}

async function hrApproverEmail(
  tx: Prisma.TransactionClient,
  organizationId: string,
  excludedUserIds: string[] = [],
) {
  const membership = await tx.membership.findFirst({
    where: {
      organizationId,
      status: "ACTIVE",
      userId: { notIn: excludedUserIds },
      roles: {
        some: { role: { permissions: { some: { permission: { name: "leave.approve" } } } } },
      },
    },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership)
    throw new AppError("CONFLICT", "No authorized HR leave approver is configured", 409);
  return membership.user.email;
}

async function assertDecisionAuthority(
  tx: Prisma.TransactionClient,
  request: { approvalStep: string; employee: { managerEmployeeId: string | null; email: string } },
  actorUserId: string,
  actorEmail: string,
  organizationId: string,
  priorActorIds: string[],
) {
  if (request.employee.email.toLowerCase() === actorEmail.toLowerCase())
    throw new AppError("FORBIDDEN", "Employees cannot approve or reject their own leave", 403);
  if (request.approvalStep === "MANAGER") {
    const actorEmployee = await tx.employee.findFirst({
      where: { organizationId, email: { equals: actorEmail } },
      select: { id: true },
    });
    if (!actorEmployee || actorEmployee.id !== request.employee.managerEmployeeId)
      throw new AppError(
        "FORBIDDEN",
        "Only the employee's assigned manager may complete this step",
        403,
      );
  }
  if (request.approvalStep === "HR" && priorActorIds.includes(actorUserId))
    throw new AppError(
      "FORBIDDEN",
      "A different authorized approver must complete the HR step",
      403,
    );
}

export async function scopedLeaveRequests(input: {
  organizationId: string;
  actorEmail: string;
  query: {
    employeeId?: string;
    status?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  };
}) {
  const actorEmployee = await db.employee.findFirst({
    where: { organizationId: input.organizationId, email: { equals: input.actorEmail } },
    select: { id: true },
  });
  if (!actorEmployee) return listLeaveRequests(input.organizationId, input.query);
  const reportIds = await db.employee.findMany({
    where: { organizationId: input.organizationId, managerEmployeeId: actorEmployee.id },
    select: { id: true },
  });
  const permitted = reportIds.map((item) => item.id);
  if (input.query.employeeId && !permitted.includes(input.query.employeeId)) throw forbiddenError();
  return listLeaveRequests(input.organizationId, input.query, permitted);
}

export async function createLeaveType(input: {
  organizationId: string;
  actorUserId: string;
  name: string;
  code: string;
  paid: boolean;
  allocationDays: number;
  eligibility?: object | null;
  accrualPolicy?: object | null;
  carryForwardEnabled: boolean;
  maxCarryForwardDays?: number | null;
  approvalPolicy: string;
  active: boolean;
  requestId?: string;
}) {
  try {
    return await db.$transaction(async (tx) => {
      const type = await tx.leaveType.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          code: input.code,
          paid: input.paid,
          allocationDays: decimal(input.allocationDays),
          eligibility: input.eligibility as Prisma.InputJsonValue | undefined,
          accrualPolicy: input.accrualPolicy as Prisma.InputJsonValue | undefined,
          carryForwardEnabled: input.carryForwardEnabled,
          maxCarryForwardDays:
            input.maxCarryForwardDays == null ? null : decimal(input.maxCarryForwardDays),
          approvalPolicy: input.approvalPolicy,
          active: input.active,
          createdByUserId: input.actorUserId,
        },
      });
      await writeAuditEvent(tx, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "LEAVE_TYPE_CREATED",
        entityType: "LeaveType",
        entityId: type.id,
        requestId: input.requestId,
      });
      return type;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new AppError("CONFLICT", "A leave type with this code already exists", 409);
    throw error;
  }
}

export async function setLeaveBalance(input: {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
  leaveTypeId: string;
  periodYear: number;
  allocatedDays: number;
  notes?: string;
  requestId?: string;
}) {
  try {
    return await db.$transaction(
      async (tx) => {
        const [employee, leaveType] = await Promise.all([
          tx.employee.findFirst({
            where: { id: input.employeeId, organizationId: input.organizationId },
          }),
          tx.leaveType.findFirst({
            where: { id: input.leaveTypeId, organizationId: input.organizationId, active: true },
          }),
        ]);
        if (!employee || !leaveType) throw notFoundError();
        const existing = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_periodYear: {
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              periodYear: input.periodYear,
            },
          },
        });
        if (
          existing &&
          input.allocatedDays + number(existing.carriedDays) < number(existing.usedDays)
        )
          throw validationError({
            allocatedDays: ["Allocation cannot be below already used leave"],
          });
        const balance = await tx.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_periodYear: {
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              periodYear: input.periodYear,
            },
          },
          create: {
            organizationId: input.organizationId,
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            periodYear: input.periodYear,
            allocatedDays: decimal(input.allocatedDays),
          },
          update: { allocatedDays: decimal(input.allocatedDays) },
        });
        const delta = input.allocatedDays - number(existing?.allocatedDays);
        await tx.leaveBalanceTransaction.create({
          data: {
            organizationId: input.organizationId,
            balanceId: balance.id,
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            transactionType: "ALLOCATION",
            amountDays: decimal(delta),
            balanceAfter: decimal(remaining(balance)),
            notes: input.notes,
            actorUserId: input.actorUserId,
          },
        });
        await writeAuditEvent(tx, {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: "LEAVE_BALANCE_ALLOCATED",
          entityType: "LeaveBalance",
          entityId: balance.id,
          requestId: input.requestId,
          metadata: {
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            periodYear: input.periodYear,
            allocatedDays: input.allocatedDays,
          },
        });
        return { ...balance, remainingDays: remaining(balance) };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      throw new AppError("CONFLICT", "The balance changed concurrently", 409);
    throw error;
  }
}

export async function carryForwardLeave(input: {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
  leaveTypeId: string;
  fromYear: number;
  toYear: number;
  requestId?: string;
}) {
  try {
    return await db.$transaction(
      async (tx) => {
        const leaveType = await tx.leaveType.findFirst({
          where: { id: input.leaveTypeId, organizationId: input.organizationId, active: true },
        });
        if (!leaveType) throw notFoundError();
        if (!leaveType.carryForwardEnabled)
          throw new AppError("CONFLICT", "Carry-forward is not enabled for this leave type", 409);
        const source = await tx.leaveBalance.findFirst({
          where: {
            organizationId: input.organizationId,
            employeeId: input.employeeId,
            leaveTypeId: input.leaveTypeId,
            periodYear: input.fromYear,
          },
        });
        if (!source) throw notFoundError();
        const available = Math.max(0, remaining(source));
        const carried =
          leaveType.maxCarryForwardDays == null
            ? available
            : Math.min(available, number(leaveType.maxCarryForwardDays));
        const existing = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_periodYear: {
              employeeId: input.employeeId,
              leaveTypeId: input.leaveTypeId,
              periodYear: input.toYear,
            },
          },
        });
        if (
          existing &&
          (await tx.leaveBalanceTransaction.findFirst({
            where: {
              balanceId: existing.id,
              transactionType: "CARRY_FORWARD",
              notes: `Carried from ${input.fromYear}`,
            },
          }))
        )
          throw new AppError(
            "CONFLICT",
            "Carry-forward has already been applied for this balance",
            409,
          );
        const target = await tx.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_periodYear: {
              employeeId: input.employeeId,
              leaveTypeId: input.leaveTypeId,
              periodYear: input.toYear,
            },
          },
          create: {
            organizationId: input.organizationId,
            employeeId: input.employeeId,
            leaveTypeId: input.leaveTypeId,
            periodYear: input.toYear,
            allocatedDays: leaveType.allocationDays,
            carriedDays: decimal(carried),
          },
          update: { carriedDays: decimal(carried) },
        });
        await tx.leaveBalanceTransaction.create({
          data: {
            organizationId: input.organizationId,
            balanceId: target.id,
            employeeId: input.employeeId,
            leaveTypeId: input.leaveTypeId,
            transactionType: "CARRY_FORWARD",
            amountDays: decimal(carried),
            balanceAfter: decimal(remaining(target)),
            actorUserId: input.actorUserId,
            notes: `Carried from ${input.fromYear}`,
          },
        });
        await writeAuditEvent(tx, {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: "LEAVE_BALANCE_CARRIED_FORWARD",
          entityType: "LeaveBalance",
          entityId: target.id,
          requestId: input.requestId,
          metadata: { fromYear: input.fromYear, toYear: input.toYear, carriedDays: carried },
        });
        return { ...target, remainingDays: remaining(target) };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      throw new AppError("CONFLICT", "Carry-forward changed concurrently", 409);
    throw error;
  }
}

export async function createAttachmentUpload(input: {
  organizationId: string;
  userEmail: string;
  fileName: string;
  contentType: string;
  byteSize: number;
}) {
  const employee = await selfEmployee(db, input.organizationId, input.userEmail);
  const objectKey = `employees/${input.organizationId}/${employee.id}/leave/${crypto.randomUUID()}-${input.fileName}`;
  return {
    objectKey,
    uploadUrl: await createUploadUrl(objectKey, input.contentType),
    fileName: input.fileName,
    contentType: input.contentType,
    byteSize: input.byteSize,
  };
}

export async function leaveAttachmentDownload(input: {
  organizationId: string;
  actorUserId: string;
  actorEmail: string;
  id: string;
  requestId?: string;
}) {
  const request = await db.leaveRequest.findFirst({
    where: { id: input.id, organizationId: input.organizationId },
    include: { employee: true },
  });
  if (!request || !request.attachmentObjectKey) throw notFoundError();
  const actor = await db.employee.findFirst({
    where: { organizationId: input.organizationId, email: { equals: input.actorEmail } },
    select: { id: true },
  });
  if (actor && actor.id !== request.employeeId && actor.id !== request.employee.managerEmployeeId)
    throw forbiddenError();
  if (
    !request.attachmentObjectKey.startsWith(
      `employees/${input.organizationId}/${request.employeeId}/leave/`,
    )
  )
    throw forbiddenError();
  const downloadUrl = await createDownloadUrl(request.attachmentObjectKey);
  await db.$transaction((tx) =>
    writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "LEAVE_ATTACHMENT_DOWNLOADED",
      entityType: "LeaveRequest",
      entityId: request.id,
      requestId: input.requestId,
    }),
  );
  return {
    downloadUrl,
    fileName: request.attachmentFileName,
    contentType: request.attachmentContentType,
  };
}

export async function requestLeave(input: {
  organizationId: string;
  actorUserId: string;
  userEmail: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  durationType: "FULL_DAY" | "HALF_DAY";
  reason: string;
  attachmentObjectKey?: string;
  attachmentFileName?: string;
  attachmentContentType?: string;
  attachmentByteSize?: number;
  requestId?: string;
}) {
  if (input.attachmentObjectKey) {
    const owner = await selfEmployee(db, input.organizationId, input.userEmail);
    if (
      !input.attachmentObjectKey.startsWith(`employees/${input.organizationId}/${owner.id}/leave/`)
    )
      throw validationError({
        attachmentObjectKey: ["Attachment key is not owned by the authenticated employee"],
      });
    await verifyStoredObject(
      input.attachmentObjectKey,
      input.attachmentContentType!,
      input.attachmentByteSize!,
    );
  }
  try {
    return await db.$transaction(
      async (tx) => {
        const employee = await selfEmployee(tx, input.organizationId, input.userEmail);
        const leaveType = await tx.leaveType.findFirst({
          where: { id: input.leaveTypeId, organizationId: input.organizationId, active: true },
        });
        if (!leaveType) throw notFoundError();
        assertEligibility(employee, leaveType.eligibility);
        const start = date(input.startDate);
        const end = date(input.endDate);
        if (start.getUTCFullYear() !== end.getUTCFullYear())
          throw validationError({ endDate: ["A leave request must stay within one balance year"] });
        const overlap = await tx.leaveRequest.findFirst({
          where: {
            organizationId: input.organizationId,
            employeeId: employee.id,
            status: { in: ["PENDING", "APPROVED"] },
            startDate: { lte: end },
            endDate: { gte: start },
          },
        });
        if (overlap)
          throw new AppError(
            "CONFLICT",
            "The leave request overlaps an existing pending or approved request",
            409,
          );
        const attendanceConflict = await tx.attendanceRecord.findFirst({
          where: {
            organizationId: input.organizationId,
            employeeId: employee.id,
            workDate: { gte: start, lte: end },
            OR: [{ checkInAt: { not: null } }, { checkOutAt: { not: null } }],
          },
        });
        if (attendanceConflict)
          throw new AppError(
            "CONFLICT",
            "Recorded attendance conflicts with the requested leave period",
            409,
          );
        const days = await chargeableDates(tx, input.organizationId, employee.id, start, end);
        const durationDays = input.durationType === "HALF_DAY" ? 0.5 : days.length;
        if (durationDays <= 0)
          throw new AppError(
            "CONFLICT",
            "The selected period contains only holidays or weekly offs",
            409,
          );
        const balance = await tx.leaveBalance.findFirst({
          where: {
            organizationId: input.organizationId,
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            periodYear: start.getUTCFullYear(),
          },
        });
        if (!balance)
          throw new AppError("CONFLICT", "No leave balance is allocated for this period", 409);
        const pending = await tx.leaveRequest.aggregate({
          where: {
            organizationId: input.organizationId,
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            status: "PENDING",
            startDate: {
              gte: new Date(Date.UTC(start.getUTCFullYear(), 0, 1)),
              lte: new Date(Date.UTC(start.getUTCFullYear(), 11, 31)),
            },
          },
          _sum: { durationDays: true },
        });
        if (durationDays > remaining(balance) - number(pending._sum.durationDays))
          throw new AppError("CONFLICT", "Insufficient available leave balance", 409);
        const approvalStep = leaveType.approvalPolicy === "HR" ? "HR" : "MANAGER";
        const request = await tx.leaveRequest.create({
          data: {
            organizationId: input.organizationId,
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            startDate: start,
            endDate: end,
            durationDays: decimal(durationDays),
            durationType: input.durationType,
            reason: input.reason,
            approvalStep,
            requestedByUserId: input.actorUserId,
            attachmentObjectKey: input.attachmentObjectKey,
            attachmentFileName: input.attachmentFileName,
            attachmentContentType: input.attachmentContentType,
            attachmentByteSize: input.attachmentByteSize,
          },
          include: leaveRequestInclude,
        });
        const manager = employee.managerEmployeeId
          ? await tx.employee.findFirst({
              where: { id: employee.managerEmployeeId, organizationId: input.organizationId },
            })
          : null;
        const recipient =
          approvalStep === "MANAGER" && manager
            ? manager.email
            : await hrApproverEmail(tx, input.organizationId, [input.actorUserId]);
        await persistNotification(tx, {
          organizationId: input.organizationId,
          leaveRequestId: request.id,
          email: recipient,
          type: "LEAVE_REQUESTED",
          title: "Leave request submitted",
          body: `${employee.firstName} ${employee.lastName} requested ${durationDays} day(s) of ${leaveType.name}.`,
        });
        await writeAuditEvent(tx, {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: "LEAVE_REQUESTED",
          entityType: "LeaveRequest",
          entityId: request.id,
          requestId: input.requestId,
          metadata: { employeeId: employee.id, leaveTypeId: leaveType.id, durationDays },
        });
        return request;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      throw new AppError(
        "CONFLICT",
        "The leave request conflicted with another concurrent change",
        409,
      );
    throw error;
  }
}

export async function decideLeave(input: {
  organizationId: string;
  actorUserId: string;
  actorEmail: string;
  id: string;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
  requestId?: string;
}) {
  try {
    return await db.$transaction(
      async (tx) => {
        const request = await tx.leaveRequest.findFirst({
          where: { id: input.id, organizationId: input.organizationId },
          include: { employee: true, leaveType: true, approvals: true },
        });
        if (!request) throw notFoundError();
        if (request.status !== "PENDING")
          throw new AppError(
            "CONFLICT",
            `Leave request cannot transition from ${request.status}`,
            409,
          );
        await assertDecisionAuthority(
          tx,
          request,
          input.actorUserId,
          input.actorEmail,
          input.organizationId,
          request.approvals.map((item) => item.actorUserId),
        );
        await tx.leaveApproval.create({
          data: {
            organizationId: input.organizationId,
            leaveRequestId: request.id,
            step: request.approvalStep,
            decision: input.decision,
            reason: input.reason,
            actorUserId: input.actorUserId,
          },
        });
        if (input.decision === "REJECTED") {
          const rejected = await tx.leaveRequest.update({
            where: { id: request.id },
            data: { status: "REJECTED", decisionReason: input.reason, decidedAt: new Date() },
            include: leaveRequestInclude,
          });
          await persistNotification(tx, {
            organizationId: input.organizationId,
            leaveRequestId: request.id,
            email: request.employee.email,
            type: "LEAVE_REJECTED",
            title: "Leave request rejected",
            body: input.reason!,
          });
          await writeAuditEvent(tx, {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "LEAVE_REJECTED",
            entityType: "LeaveRequest",
            entityId: request.id,
            requestId: input.requestId,
            metadata: { employeeId: request.employeeId, reason: input.reason },
          });
          return rejected;
        }
        if (
          request.leaveType.approvalPolicy === "MANAGER_THEN_HR" &&
          request.approvalStep === "MANAGER"
        ) {
          const pending = await tx.leaveRequest.update({
            where: { id: request.id },
            data: { approvalStep: "HR" },
            include: leaveRequestInclude,
          });
          await persistNotification(tx, {
            organizationId: input.organizationId,
            leaveRequestId: request.id,
            email: await hrApproverEmail(tx, input.organizationId, [
              input.actorUserId,
              request.requestedByUserId,
            ]),
            type: "LEAVE_MANAGER_APPROVED",
            title: "Leave request moved to HR approval",
            body: "Manager approval is complete.",
          });
          await writeAuditEvent(tx, {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "LEAVE_APPROVAL_STEP_COMPLETED",
            entityType: "LeaveRequest",
            entityId: request.id,
            requestId: input.requestId,
            metadata: { step: "MANAGER", nextStep: "HR" },
          });
          return pending;
        }
        const balance = await tx.leaveBalance.findFirst({
          where: {
            organizationId: input.organizationId,
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            periodYear: request.startDate.getUTCFullYear(),
          },
        });
        const days = await chargeableDates(
          tx,
          input.organizationId,
          request.employeeId,
          request.startDate,
          request.endDate,
        );
        const approvedDuration =
          request.durationType === "HALF_DAY" ? (days.length ? 0.5 : 0) : days.length;
        if (approvedDuration <= 0)
          throw new AppError(
            "CONFLICT",
            "The leave period no longer contains a chargeable work day",
            409,
          );
        if (!balance || approvedDuration > remaining(balance))
          throw new AppError("CONFLICT", "Insufficient leave balance for approval", 409);
        const conflict = await tx.attendanceRecord.findFirst({
          where: {
            organizationId: input.organizationId,
            employeeId: request.employeeId,
            workDate: { in: days },
            OR: [{ checkInAt: { not: null } }, { checkOutAt: { not: null } }],
          },
        });
        if (conflict)
          throw new AppError(
            "CONFLICT",
            "Recorded attendance conflicts with this leave approval",
            409,
          );
        const approvedDays = decimal(approvedDuration);
        const updatedBalance = await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { usedDays: { increment: approvedDays } },
        });
        await tx.leaveBalanceTransaction.create({
          data: {
            organizationId: input.organizationId,
            balanceId: balance.id,
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            leaveRequestId: request.id,
            transactionType: "DEBIT",
            amountDays: approvedDays.negated(),
            balanceAfter: decimal(remaining(updatedBalance)),
            notes: "Approved leave",
            actorUserId: input.actorUserId,
          },
        });
        for (const workDate of days)
          await tx.attendanceRecord.upsert({
            where: { employeeId_workDate: { employeeId: request.employeeId, workDate } },
            create: {
              organizationId: input.organizationId,
              employeeId: request.employeeId,
              workDate,
              status: "LEAVE",
              source: "LEAVE",
            },
            update: { status: "LEAVE", source: "LEAVE" },
          });
        const approved = await tx.leaveRequest.update({
          where: { id: request.id },
          data: {
            status: "APPROVED",
            durationDays: approvedDays,
            decisionReason: input.reason,
            decidedAt: new Date(),
          },
          include: leaveRequestInclude,
        });
        await persistNotification(tx, {
          organizationId: input.organizationId,
          leaveRequestId: request.id,
          email: request.employee.email,
          type: "LEAVE_APPROVED",
          title: "Leave request approved",
          body: `${number(request.durationDays)} day(s) approved.`,
        });
        await writeAuditEvent(tx, {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: "LEAVE_APPROVED",
          entityType: "LeaveRequest",
          entityId: request.id,
          requestId: input.requestId,
          metadata: {
            employeeId: request.employeeId,
            durationDays: number(request.durationDays),
            attendanceDates: days.map(isoDate),
          },
        });
        return approved;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      throw new AppError(
        "CONFLICT",
        "The leave decision conflicted with another concurrent change",
        409,
      );
    throw error;
  }
}

export async function selfLeaveDashboard(input: {
  organizationId: string;
  userEmail: string;
  year?: number;
}) {
  const employee = await selfEmployee(db, input.organizationId, input.userEmail);
  const [balances, requests] = await Promise.all([
    listLeaveBalances(input.organizationId, employee.id, input.year),
    listLeaveRequests(input.organizationId, { employeeId: employee.id, page: 1, pageSize: 100 }),
  ]);
  return {
    employee: {
      id: employee.id,
      employeeNo: employee.employeeNo,
      firstName: employee.firstName,
      lastName: employee.lastName,
    },
    balances: balances.map((item) => ({ ...item, remainingDays: remaining(item) })),
    requests: requests.items,
  };
}
export async function leaveCalendar(
  organizationId: string,
  query: { view: CalendarView; date: string; employeeId?: string; leaveTypeId?: string },
  actorEmail?: string,
) {
  const range = calendarRange(query.view, query.date);
  const actor = actorEmail
    ? await db.employee.findFirst({
        where: { organizationId, email: { equals: actorEmail } },
        select: { id: true },
      })
    : null;
  const reports = actor
    ? await db.employee.findMany({
        where: { organizationId, managerEmployeeId: actor.id },
        select: { id: true },
      })
    : [];
  const permitted = reports.map((item) => item.id);
  if (actor && query.employeeId && !permitted.includes(query.employeeId)) throw forbiddenError();
  const requests = await db.leaveRequest.findMany({
    where: {
      ...leaveWhere(organizationId, {
        employeeId: query.employeeId,
        leaveTypeId: query.leaveTypeId,
        from: range.from,
        to: range.to,
      }),
      status: "APPROVED",
      ...(actor ? { employeeId: { in: permitted } } : {}),
    },
    include: leaveRequestInclude,
    orderBy: { startDate: "asc" },
  });
  return { view: query.view, selectedDate: query.date, ...range, requests };
}

export async function reconcileApprovedLeave(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    actorUserId: string;
    employeeId?: string;
    from?: Date;
    to?: Date;
    requestId?: string;
  },
) {
  const requests = await tx.leaveRequest.findMany({
    where: {
      organizationId: input.organizationId,
      status: "APPROVED",
      ...(input.employeeId ? { employeeId: input.employeeId } : {}),
      ...(input.from || input.to
        ? {
            startDate: { ...(input.to ? { lte: input.to } : {}) },
            endDate: { ...(input.from ? { gte: input.from } : {}) },
          }
        : {}),
    },
  });
  for (const request of requests) {
    const dates = await chargeableDates(
      tx,
      input.organizationId,
      request.employeeId,
      request.startDate,
      request.endDate,
    );
    const nextDuration =
      request.durationType === "HALF_DAY" ? (dates.length ? 0.5 : 0) : dates.length;
    const delta = nextDuration - number(request.durationDays);
    const balance = await tx.leaveBalance.findFirstOrThrow({
      where: {
        organizationId: input.organizationId,
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        periodYear: request.startDate.getUTCFullYear(),
      },
    });
    if (delta > remaining(balance))
      throw new AppError(
        "CONFLICT",
        "The policy change would exceed an approved employee leave balance",
        409,
      );
    if (delta !== 0) {
      const updated = await tx.leaveBalance.update({
        where: { id: balance.id },
        data: { usedDays: { increment: decimal(delta) } },
      });
      await tx.leaveBalanceTransaction.create({
        data: {
          organizationId: input.organizationId,
          balanceId: balance.id,
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          leaveRequestId: request.id,
          transactionType: "RECALCULATION",
          amountDays: decimal(-delta),
          balanceAfter: decimal(remaining(updated)),
          notes: "Calendar/roster policy recalculation",
          actorUserId: input.actorUserId,
        },
      });
      await tx.leaveRequest.update({
        where: { id: request.id },
        data: { durationDays: decimal(nextDuration) },
      });
    }
    const allowed = new Set(dates.map(isoDate));
    const existing = await tx.attendanceRecord.findMany({
      where: {
        organizationId: input.organizationId,
        employeeId: request.employeeId,
        source: "LEAVE",
        workDate: { gte: request.startDate, lte: request.endDate },
      },
    });
    for (const record of existing)
      if (!allowed.has(isoDate(record.workDate)))
        await tx.attendanceRecord.delete({ where: { id: record.id } });
    for (const workDate of dates)
      await tx.attendanceRecord.upsert({
        where: { employeeId_workDate: { employeeId: request.employeeId, workDate } },
        create: {
          organizationId: input.organizationId,
          employeeId: request.employeeId,
          workDate,
          status: "LEAVE",
          source: "LEAVE",
        },
        update: { status: "LEAVE", source: "LEAVE" },
      });
    if (delta !== 0 || existing.length !== dates.length)
      await writeAuditEvent(tx, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "LEAVE_POLICY_RECALCULATED",
        entityType: "LeaveRequest",
        entityId: request.id,
        requestId: input.requestId,
        metadata: {
          previousDuration: number(request.durationDays),
          nextDuration,
          attendanceDates: dates.map(isoDate),
        },
      });
  }
}
