import { db } from "@/lib/db";
import { writeAuditEvent } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";
import type { AttendanceExceptionType, VisitStatus } from "@/modules/attendance/constants";

const visitInclude = {
  candidate: {
    select: {
      id: true,
      referenceNo: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
  interview: {
    select: {
      id: true,
      referenceNo: true,
      scheduledStart: true,
      scheduledEnd: true,
      timezone: true,
      status: true,
    },
  },
  host: { select: { id: true, name: true, email: true } },
  checkInActor: { select: { id: true, name: true, email: true } },
  checkOutActor: { select: { id: true, name: true, email: true } },
} satisfies Prisma.CandidateVisitInclude;

export async function listVisits(
  organizationId: string,
  query: {
    q?: string;
    status?: VisitStatus;
    page: number;
    pageSize: number;
    direction: "asc" | "desc";
  },
) {
  const where: Prisma.CandidateVisitWhereInput = {
    organizationId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { purpose: { contains: query.q } },
            { candidate: { firstName: { contains: query.q } } },
            { candidate: { lastName: { contains: query.q } } },
            { candidate: { email: { contains: query.q } } },
          ],
        }
      : {}),
  };
  const [items, total] = await db.$transaction([
    db.candidateVisit.findMany({
      where,
      orderBy: { visitDate: query.direction },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: visitInclude,
    }),
    db.candidateVisit.count({ where }),
  ]);
  return { items, total };
}

export async function getVisit(organizationId: string, id: string) {
  return db.candidateVisit.findFirst({ where: { id, organizationId }, include: visitInclude });
}

function minutesBetween(later: Date, earlier: Date) {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / 60000));
}

async function assertHost(
  tx: Prisma.TransactionClient,
  organizationId: string,
  hostUserId?: string,
) {
  if (!hostUserId) return;
  const membership = await tx.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId: hostUserId } },
  });
  if (!membership || membership.status !== "ACTIVE")
    throw new AppError("VALIDATION_ERROR", "Host must be an active organization member", 422);
}

export async function createVisit(data: {
  organizationId: string;
  actorUserId: string;
  candidateId: string;
  interviewId?: string;
  hostUserId?: string;
  visitDate: string;
  purpose?: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const candidate = await tx.candidate.findFirst({
      where: { id: data.candidateId, organizationId: data.organizationId },
    });
    if (!candidate) throw new AppError("NOT_FOUND", "Candidate was not found", 404);
    if (data.interviewId) {
      const interview = await tx.interview.findFirst({
        where: {
          id: data.interviewId,
          organizationId: data.organizationId,
          candidateId: data.candidateId,
        },
      });
      if (!interview) throw new AppError("NOT_FOUND", "Interview was not found", 404);
    }
    await assertHost(tx, data.organizationId, data.hostUserId);
    const visit = await tx.candidateVisit.create({
      data: {
        organizationId: data.organizationId,
        candidateId: data.candidateId,
        interviewId: data.interviewId,
        hostUserId: data.hostUserId,
        visitDate: new Date(data.visitDate),
        purpose: data.purpose || undefined,
      },
    });
    await tx.candidateActivity.create({
      data: {
        organizationId: data.organizationId,
        candidateId: data.candidateId,
        actorUserId: data.actorUserId,
        action: "VISIT_REGISTERED",
        note: data.purpose,
        metadata: { visitId: visit.id, interviewId: data.interviewId, hostUserId: data.hostUserId },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: data.organizationId,
      actorUserId: data.actorUserId,
      action: "CANDIDATE_VISIT_CREATED",
      entityType: "CandidateVisit",
      entityId: visit.id,
      requestId: data.requestId,
      metadata: {
        candidateId: data.candidateId,
        interviewId: data.interviewId,
        hostUserId: data.hostUserId,
      },
    });
    return tx.candidateVisit.findUniqueOrThrow({ where: { id: visit.id }, include: visitInclude });
  });
}

export async function checkInVisit(data: {
  organizationId: string;
  actorUserId: string;
  visitId?: string;
  candidateId?: string;
  interviewId?: string;
  hostUserId?: string;
  purpose?: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    let visit = data.visitId
      ? await tx.candidateVisit.findFirst({
          where: { id: data.visitId, organizationId: data.organizationId },
        })
      : null;
    let interview = data.interviewId
      ? await tx.interview.findFirst({
          where: { id: data.interviewId, organizationId: data.organizationId },
        })
      : null;
    if (!visit && interview)
      visit = await tx.candidateVisit.findFirst({
        where: { organizationId: data.organizationId, interviewId: interview.id },
      });
    if (!visit && data.candidateId)
      visit = await tx.candidateVisit.findFirst({
        where: {
          organizationId: data.organizationId,
          candidateId: data.candidateId,
          status: "REGISTERED",
        },
        orderBy: { visitDate: "asc" },
      });
    if (!interview && visit?.interviewId)
      interview = await tx.interview.findFirst({
        where: { id: visit.interviewId, organizationId: data.organizationId },
      });
    if (!visit && (data.candidateId || interview?.candidateId)) {
      const candidateId = data.candidateId || interview?.candidateId;
      if (!candidateId) throw new AppError("NOT_FOUND", "Candidate was not found", 404);
      const candidate = await tx.candidate.findFirst({
        where: { id: candidateId, organizationId: data.organizationId },
      });
      if (!candidate) throw new AppError("NOT_FOUND", "Candidate was not found", 404);
      await assertHost(tx, data.organizationId, data.hostUserId);
      visit = await tx.candidateVisit.create({
        data: {
          organizationId: data.organizationId,
          candidateId: candidate.id,
          interviewId: data.interviewId,
          hostUserId: data.hostUserId,
          visitDate: new Date(),
          purpose: data.purpose || undefined,
        },
      });
    }
    if (!visit) throw new AppError("NOT_FOUND", "Visit was not found", 404);
    if (visit.status === "CHECKED_IN")
      throw new AppError("CONFLICT", "The visit is already checked in", 409);
    if (visit.status === "CHECKED_OUT")
      throw new AppError("VALIDATION_ERROR", "A checked-out visit cannot be checked in again", 422);
    await assertHost(tx, data.organizationId, data.hostUserId);
    const now = new Date();
    const scheduledStart = interview?.scheduledStart;
    const lateArrivalMinutes =
      scheduledStart && now > scheduledStart ? minutesBetween(now, scheduledStart) : null;
    const updated = await tx.candidateVisit.update({
      where: { id: visit.id },
      data: {
        status: "CHECKED_IN",
        checkedInAt: now,
        checkInActorUserId: data.actorUserId,
        hostUserId: data.hostUserId || visit.hostUserId,
        purpose: data.purpose || visit.purpose,
        lateArrivalMinutes,
      },
    });
    await tx.candidateActivity.create({
      data: {
        organizationId: data.organizationId,
        candidateId: visit.candidateId,
        actorUserId: data.actorUserId,
        action: "CANDIDATE_ATTENDANCE_CHECKED_IN",
        note: data.purpose || visit.purpose,
        metadata: { visitId: visit.id, interviewId: visit.interviewId, lateArrivalMinutes },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: data.organizationId,
      actorUserId: data.actorUserId,
      action: "CANDIDATE_ATTENDANCE_CHECKED_IN",
      entityType: "CandidateVisit",
      entityId: visit.id,
      requestId: data.requestId,
      metadata: {
        candidateId: visit.candidateId,
        interviewId: visit.interviewId,
        lateArrivalMinutes,
      },
    });
    return tx.candidateVisit.findUniqueOrThrow({
      where: { id: updated.id },
      include: visitInclude,
    });
  });
}

export async function checkOutVisit(data: {
  organizationId: string;
  actorUserId: string;
  visitId: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const visit = await tx.candidateVisit.findFirst({
      where: { id: data.visitId, organizationId: data.organizationId },
    });
    if (!visit) throw new AppError("NOT_FOUND", "Visit was not found", 404);
    if (visit.status !== "CHECKED_IN" || !visit.checkedInAt)
      throw new AppError("VALIDATION_ERROR", "Only a checked-in visit can be checked out", 422);
    const interview = visit.interviewId
      ? await tx.interview.findFirst({
          where: { id: visit.interviewId, organizationId: data.organizationId },
        })
      : null;
    const now = new Date();
    const earlyDepartureMinutes =
      interview?.scheduledEnd && now < interview.scheduledEnd
        ? minutesBetween(interview.scheduledEnd, now)
        : null;
    const updated = await tx.candidateVisit.update({
      where: { id: visit.id },
      data: {
        status: "CHECKED_OUT",
        checkedOutAt: now,
        checkOutActorUserId: data.actorUserId,
        durationMinutes: minutesBetween(now, visit.checkedInAt),
        earlyDepartureMinutes,
      },
    });
    await tx.candidateActivity.create({
      data: {
        organizationId: data.organizationId,
        candidateId: visit.candidateId,
        actorUserId: data.actorUserId,
        action: "CANDIDATE_ATTENDANCE_CHECKED_OUT",
        metadata: {
          visitId: visit.id,
          interviewId: visit.interviewId,
          durationMinutes: updated.durationMinutes,
          earlyDepartureMinutes,
        },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: data.organizationId,
      actorUserId: data.actorUserId,
      action: "CANDIDATE_ATTENDANCE_CHECKED_OUT",
      entityType: "CandidateVisit",
      entityId: visit.id,
      requestId: data.requestId,
      metadata: {
        candidateId: visit.candidateId,
        interviewId: visit.interviewId,
        durationMinutes: updated.durationMinutes,
        earlyDepartureMinutes,
      },
    });
    return tx.candidateVisit.findUniqueOrThrow({
      where: { id: updated.id },
      include: visitInclude,
    });
  });
}

export async function recordException(data: {
  organizationId: string;
  actorUserId: string;
  visitId: string;
  exceptionType: AttendanceExceptionType;
  notes: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const visit = await tx.candidateVisit.findFirst({
      where: { id: data.visitId, organizationId: data.organizationId },
    });
    if (!visit) throw new AppError("NOT_FOUND", "Visit was not found", 404);
    const updated = await tx.candidateVisit.update({
      where: { id: visit.id },
      data: { exceptionType: data.exceptionType, exceptionNotes: data.notes },
    });
    await tx.candidateActivity.create({
      data: {
        organizationId: data.organizationId,
        candidateId: visit.candidateId,
        actorUserId: data.actorUserId,
        action: "CANDIDATE_ATTENDANCE_EXCEPTION_RECORDED",
        note: data.notes,
        metadata: { visitId: visit.id, exceptionType: data.exceptionType },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: data.organizationId,
      actorUserId: data.actorUserId,
      action: "CANDIDATE_ATTENDANCE_EXCEPTION_RECORDED",
      entityType: "CandidateVisit",
      entityId: visit.id,
      requestId: data.requestId,
      metadata: {
        candidateId: visit.candidateId,
        exceptionType: data.exceptionType,
        notes: data.notes,
      },
    });
    return tx.candidateVisit.findUniqueOrThrow({
      where: { id: updated.id },
      include: visitInclude,
    });
  });
}
