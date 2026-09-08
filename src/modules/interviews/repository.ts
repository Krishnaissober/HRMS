import { db } from "@/lib/db";
import { writeAuditEvent } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";
import type { InterviewStatus } from "@/modules/interviews/constants";

const activeStatuses: InterviewStatus[] = ["SCHEDULED", "CHECKED_IN", "RESCHEDULED"];

const interviewInclude = {
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
  application: { include: { requisition: true } },
  template: true,
  participants: { include: { user: { select: { id: true, name: true, email: true } } } },
  evaluations: {
    include: { interviewer: { select: { id: true, name: true, email: true } }, template: true },
  },
  activities: {
    orderBy: { createdAt: "desc" as const },
    include: { actor: { select: { id: true, name: true, email: true } } },
  },
  notifications: true,
  candidateVisits: { orderBy: { visitDate: "desc" as const } },
} satisfies Prisma.InterviewInclude;

export async function listInterviews(
  organizationId: string,
  query: {
    q?: string;
    status?: InterviewStatus;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
    direction: "asc" | "desc";
  },
) {
  const where: Prisma.InterviewWhereInput = {
    organizationId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { referenceNo: { contains: query.q } },
            { candidate: { firstName: { contains: query.q } } },
            { candidate: { lastName: { contains: query.q } } },
            { candidate: { email: { contains: query.q } } },
          ],
        }
      : {}),
    ...(query.from || query.to
      ? {
          scheduledStart: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };
  const [items, total] = await db.$transaction([
    db.interview.findMany({
      where,
      orderBy: { scheduledStart: query.direction },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        candidate: { select: { firstName: true, lastName: true, referenceNo: true } },
        participants: { include: { user: { select: { name: true, email: true } } } },
      },
    }),
    db.interview.count({ where }),
  ]);
  return { items, total };
}

export async function getInterview(organizationId: string, id: string) {
  return db.interview.findFirst({ where: { id, organizationId }, include: interviewInclude });
}

export async function createInterview(data: {
  organizationId: string;
  actorUserId: string;
  candidateId: string;
  applicationId: string;
  round: number;
  participantIds: string[];
  templateId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  mode: string;
  location?: string;
  meetingLink?: string;
  instructions?: string;
  requestId?: string;
}) {
  const start = new Date(data.scheduledStart);
  const end = new Date(data.scheduledEnd);
  return db.$transaction(async (tx) => {
    const candidate = await tx.candidate.findFirst({
      where: { id: data.candidateId, organizationId: data.organizationId },
    });
    const application = await tx.application.findFirst({
      where: {
        id: data.applicationId,
        organizationId: data.organizationId,
        candidateId: data.candidateId,
      },
    });
    if (!candidate || !application)
      throw new AppError("NOT_FOUND", "Candidate application was not found", 404);
    const members = await tx.membership.findMany({
      where: {
        organizationId: data.organizationId,
        userId: { in: data.participantIds },
        status: "ACTIVE",
      },
      select: { userId: true },
    });
    if (members.length !== new Set(data.participantIds).size)
      throw new AppError(
        "VALIDATION_ERROR",
        "Every interviewer must belong to the organization",
        422,
      );
    if (data.templateId) {
      const template = await tx.interviewTemplate.findFirst({
        where: { id: data.templateId, organizationId: data.organizationId, status: "ACTIVE" },
      });
      if (!template) throw new AppError("NOT_FOUND", "Interview template was not found", 404);
    }
    const existingInterview = await tx.interview.findFirst({
      where: {
        organizationId: data.organizationId,
        candidateId: data.candidateId,
        status: { not: "CANCELLED" },
      },
      select: {
        referenceNo: true,
        status: true,
        scheduledStart: true,
        scheduledEnd: true,
      },
    });
    if (existingInterview) {
      throw new AppError(
        "CONFLICT",
        "This candidate already has an interview. Reschedule the existing interview instead of creating another one.",
        409,
        {
          interviewReferenceNo: existingInterview.referenceNo,
          interviewStatus: existingInterview.status,
          scheduledStart: existingInterview.scheduledStart?.toISOString(),
          scheduledEnd: existingInterview.scheduledEnd?.toISOString(),
          conflictType: "candidate",
        },
      );
    }
    const candidateConflict = await tx.interview.findFirst({
      where: {
        organizationId: data.organizationId,
        candidateId: data.candidateId,
        status: { in: activeStatuses },
        scheduledStart: { lt: end },
        scheduledEnd: { gt: start },
      },
    });
    const interviewerConflict = await tx.interviewParticipant.findFirst({
      where: {
        organizationId: data.organizationId,
        userId: { in: data.participantIds },
        interview: {
          organizationId: data.organizationId,
          status: { in: activeStatuses },
          scheduledStart: { lt: end },
          scheduledEnd: { gt: start },
        },
      },
      include: {
        interview: { select: { referenceNo: true, scheduledStart: true, scheduledEnd: true } },
      },
    });
    if (candidateConflict || interviewerConflict) {
      const conflictInterview = candidateConflict || interviewerConflict!.interview;
      throw new AppError(
        "CONFLICT",
        "The candidate or an interviewer has a conflicting interview",
        409,
        {
          interviewReferenceNo: conflictInterview.referenceNo,
          scheduledStart: conflictInterview.scheduledStart?.toISOString(),
          scheduledEnd: conflictInterview.scheduledEnd?.toISOString(),
          conflictType: candidateConflict ? "candidate" : "interviewer",
        },
      );
    }
    const availabilityWindows = await tx.interviewAvailability.findMany({
      where: {
        organizationId: data.organizationId,
        userId: { in: data.participantIds },
        status: "AVAILABLE",
      },
    });
    for (const participantId of data.participantIds) {
      const participantWindows = availabilityWindows.filter(
        (window) => window.userId === participantId,
      );
      if (
        participantWindows.length &&
        !participantWindows.some((window) => window.startsAt <= start && window.endsAt >= end)
      )
        throw new AppError(
          "CONFLICT",
          "An interviewer is not available for the scheduled time",
          409,
        );
    }
    const referenceNo = `INT-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const interview = await tx.interview.create({
      data: {
        organizationId: data.organizationId,
        referenceNo,
        candidateId: data.candidateId,
        applicationId: data.applicationId,
        templateId: data.templateId || undefined,
        round: data.round,
        scheduledStart: start,
        scheduledEnd: end,
        timezone: data.timezone,
        mode: data.mode,
        location: data.location || undefined,
        meetingLink: data.mode === "VIDEO" ? data.meetingLink || undefined : undefined,
        instructions: data.instructions || undefined,
        createdByUserId: data.actorUserId,
        participants: {
          create: data.participantIds.map((userId) => ({
            organizationId: data.organizationId,
            userId,
          })),
        },
      },
    });
    await tx.candidateActivity.create({
      data: {
        organizationId: data.organizationId,
        candidateId: data.candidateId,
        actorUserId: data.actorUserId,
        action: "INTERVIEW_CREATED",
        metadata: {
          interviewId: interview.id,
          applicationId: data.applicationId,
          round: data.round,
        },
      },
    });
    await tx.interviewActivity.create({
      data: {
        organizationId: data.organizationId,
        interviewId: interview.id,
        actorUserId: data.actorUserId,
        action: "INTERVIEW_CREATED",
        metadata: { round: data.round },
      },
    });
    const users = await tx.user.findMany({
      where: { id: { in: data.participantIds } },
      select: { email: true },
    });
    const recipients = [...new Set([candidate.email, ...users.map((user) => user.email)])];
    const scheduledFor = new Date(Math.max(Date.now(), start.getTime() - 24 * 60 * 60 * 1000));
    await tx.interviewNotification.createMany({
      data: recipients.map((recipient) => ({
        organizationId: data.organizationId,
        interviewId: interview.id,
        type: "INTERVIEW_SCHEDULED",
        recipient,
        scheduledFor,
      })),
    });
    await writeAuditEvent(tx, {
      organizationId: data.organizationId,
      actorUserId: data.actorUserId,
      action: "INTERVIEW_CREATED",
      entityType: "Interview",
      entityId: interview.id,
      requestId: data.requestId,
      metadata: {
        candidateId: data.candidateId,
        applicationId: data.applicationId,
        participantIds: data.participantIds,
      },
    });
    return tx.interview.findUniqueOrThrow({
      where: { id: interview.id },
      include: interviewInclude,
    });
  });
}

export async function updateInterview(data: {
  organizationId: string;
  actorUserId: string;
  id: string;
  patch: {
    status?: InterviewStatus;
    noShowReason?: string;
    noShowNotes?: string;
    rescheduleReason?: string;
    round?: number;
    participantIds?: string[];
    scheduledStart?: string;
    scheduledEnd?: string;
    timezone?: string;
    mode?: string;
    location?: string;
    meetingLink?: string;
    instructions?: string;
  };
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const current = await tx.interview.findFirst({
      where: { id: data.id, organizationId: data.organizationId },
    });
    if (!current) return null;
    const start = data.patch.scheduledStart
      ? new Date(data.patch.scheduledStart)
      : current.scheduledStart;
    const end = data.patch.scheduledEnd ? new Date(data.patch.scheduledEnd) : current.scheduledEnd;
    if (end <= start)
      throw new AppError("VALIDATION_ERROR", "Interview end must be after interview start", 422);
    const participantIds =
      data.patch.participantIds ||
      (
        await tx.interviewParticipant.findMany({
          where: { interviewId: current.id },
          select: { userId: true },
        })
      ).map((participant) => participant.userId);
    if (data.patch.participantIds) {
      const members = await tx.membership.findMany({
        where: {
          organizationId: data.organizationId,
          userId: { in: participantIds },
          status: "ACTIVE",
        },
        select: { userId: true },
      });
      if (members.length !== new Set(participantIds).size)
        throw new AppError(
          "VALIDATION_ERROR",
          "Every interviewer must belong to the organization",
          422,
        );
      await tx.interviewParticipant.deleteMany({ where: { interviewId: current.id } });
      await tx.interviewParticipant.createMany({
        data: participantIds.map((userId) => ({
          organizationId: data.organizationId,
          interviewId: current.id,
          userId,
        })),
      });
    }
    const scheduleChanged = Boolean(
      data.patch.scheduledStart || data.patch.scheduledEnd || data.patch.participantIds,
    );
    if (scheduleChanged) {
      const candidateConflict = await tx.interview.findFirst({
        where: {
          organizationId: data.organizationId,
          id: { not: current.id },
          candidateId: current.candidateId,
          status: { in: activeStatuses },
          scheduledStart: { lt: end },
          scheduledEnd: { gt: start },
        },
      });
      const interviewerConflict = await tx.interviewParticipant.findFirst({
        where: {
          organizationId: data.organizationId,
          interviewId: { not: current.id },
          userId: { in: participantIds },
          interview: {
            organizationId: data.organizationId,
            status: { in: activeStatuses },
            scheduledStart: { lt: end },
            scheduledEnd: { gt: start },
          },
        },
        include: {
          interview: { select: { referenceNo: true, scheduledStart: true, scheduledEnd: true } },
        },
      });
      if (candidateConflict || interviewerConflict) {
        const conflictInterview = candidateConflict || interviewerConflict!.interview;
        throw new AppError(
          "CONFLICT",
          "The candidate or an interviewer has a conflicting interview",
          409,
          {
            interviewReferenceNo: conflictInterview.referenceNo,
            scheduledStart: conflictInterview.scheduledStart?.toISOString(),
            scheduledEnd: conflictInterview.scheduledEnd?.toISOString(),
            conflictType: candidateConflict ? "candidate" : "interviewer",
          },
        );
      }
      const availabilityWindows = await tx.interviewAvailability.findMany({
        where: {
          organizationId: data.organizationId,
          userId: { in: participantIds },
          status: "AVAILABLE",
        },
      });
      for (const participantId of participantIds) {
        const participantWindows = availabilityWindows.filter(
          (window) => window.userId === participantId,
        );
        if (
          participantWindows.length &&
          !participantWindows.some((window) => window.startsAt <= start && window.endsAt >= end)
        )
          throw new AppError(
            "CONFLICT",
            "An interviewer is not available for the scheduled time",
            409,
          );
      }
    }
    if (data.patch.status === "NO_SHOW" && !data.patch.noShowReason?.trim())
      throw new AppError(
        "VALIDATION_ERROR",
        "A reason is required when marking an interview as no-show",
        422,
      );
    const updated = await tx.interview.update({
      where: { id: current.id },
      data: {
        status: data.patch.status,
        noShowReason: data.patch.status === "NO_SHOW" ? data.patch.noShowReason?.trim() : undefined,
        noShowNotes:
          data.patch.status === "NO_SHOW" ? data.patch.noShowNotes?.trim() || null : undefined,
        round: data.patch.round,
        scheduledStart: start,
        scheduledEnd: end,
        timezone: data.patch.timezone,
        mode: data.patch.mode,
        location: data.patch.location,
        meetingLink: data.patch.mode
          ? data.patch.mode === "VIDEO"
            ? data.patch.meetingLink || undefined
            : null
          : undefined,
        instructions: data.patch.instructions,
      },
    });
    const statusChanged = Boolean(data.patch.status && data.patch.status !== current.status);
    const isReschedule =
      data.patch.status === "RESCHEDULED" &&
      Boolean(data.patch.scheduledStart || data.patch.scheduledEnd);
    const action = isReschedule
      ? "INTERVIEW_RESCHEDULED"
      : statusChanged && data.patch.status === "NO_SHOW"
        ? "INTERVIEW_NO_SHOW"
        : statusChanged
          ? "INTERVIEW_STATUS_CHANGED"
          : "INTERVIEW_UPDATED";
    await tx.interviewActivity.create({
      data: {
        organizationId: data.organizationId,
        interviewId: current.id,
        actorUserId: data.actorUserId,
        action,
        note: isReschedule
          ? data.patch.rescheduleReason?.trim() || undefined
          : data.patch.status === "NO_SHOW"
            ? data.patch.noShowReason?.trim()
            : undefined,
        metadata: {
          fromStatus: current.status,
          toStatus: updated.status,
          rescheduleReason: isReschedule
            ? data.patch.rescheduleReason?.trim() || undefined
            : undefined,
          noShowReason:
            data.patch.status === "NO_SHOW" ? data.patch.noShowReason?.trim() : undefined,
          noShowNotes:
            data.patch.status === "NO_SHOW"
              ? data.patch.noShowNotes?.trim() || undefined
              : undefined,
        },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: data.organizationId,
      actorUserId: data.actorUserId,
      action,
      entityType: "Interview",
      entityId: current.id,
      requestId: data.requestId,
      metadata: {
        fromStatus: current.status,
        toStatus: updated.status,
        noShowReason: data.patch.status === "NO_SHOW" ? data.patch.noShowReason?.trim() : undefined,
        noShowNotes:
          data.patch.status === "NO_SHOW" ? data.patch.noShowNotes?.trim() || undefined : undefined,
      },
    });
    return tx.interview.findUniqueOrThrow({ where: { id: current.id }, include: interviewInclude });
  });
}

export async function updateInterviewAttendance(data: {
  organizationId: string;
  actorUserId: string;
  id: string;
  direction: "CHECK_IN" | "CHECK_OUT";
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const current = await tx.interview.findFirst({
      where: { id: data.id, organizationId: data.organizationId },
    });
    if (!current) return null;
    const now = new Date();
    if (data.direction === "CHECK_IN" && !["SCHEDULED", "RESCHEDULED"].includes(current.status))
      throw new AppError(
        "VALIDATION_ERROR",
        "Interview cannot be checked in from its current state",
        422,
      );
    if (data.direction === "CHECK_OUT" && current.status !== "CHECKED_IN")
      throw new AppError("VALIDATION_ERROR", "Only a checked-in interview can be checked out", 422);
    const status: InterviewStatus = data.direction === "CHECK_IN" ? "CHECKED_IN" : "COMPLETED";
    const updated = await tx.interview.update({
      where: { id: current.id },
      data:
        data.direction === "CHECK_IN"
          ? { status, candidateCheckedInAt: now, checkInActorUserId: data.actorUserId }
          : { status, candidateCheckedOutAt: now, checkOutActorUserId: data.actorUserId },
    });
    const visit = await tx.candidateVisit.findFirst({
      where: { organizationId: data.organizationId, interviewId: current.id },
    });
    if (data.direction === "CHECK_IN") {
      const participant = await tx.interviewParticipant.findFirst({
        where: { interviewId: current.id, organizationId: data.organizationId },
        orderBy: { createdAt: "asc" },
      });
      const lateArrivalMinutes =
        now > current.scheduledStart
          ? Math.max(0, Math.floor((now.getTime() - current.scheduledStart.getTime()) / 60000))
          : null;
      if (visit)
        await tx.candidateVisit.update({
          where: { id: visit.id },
          data: {
            status: "CHECKED_IN",
            checkedInAt: now,
            checkInActorUserId: data.actorUserId,
            hostUserId: visit.hostUserId || participant?.userId,
            lateArrivalMinutes,
          },
        });
      else
        await tx.candidateVisit.create({
          data: {
            organizationId: data.organizationId,
            candidateId: current.candidateId,
            interviewId: current.id,
            hostUserId: participant?.userId,
            visitDate: current.scheduledStart,
            purpose: "Interview",
            status: "CHECKED_IN",
            checkedInAt: now,
            checkInActorUserId: data.actorUserId,
            lateArrivalMinutes,
          },
        });
    } else if (visit) {
      const earlyDepartureMinutes =
        now < current.scheduledEnd
          ? Math.max(0, Math.floor((current.scheduledEnd.getTime() - now.getTime()) / 60000))
          : null;
      await tx.candidateVisit.update({
        where: { id: visit.id },
        data: {
          status: "CHECKED_OUT",
          checkedOutAt: now,
          checkOutActorUserId: data.actorUserId,
          durationMinutes: visit.checkedInAt
            ? Math.max(0, Math.floor((now.getTime() - visit.checkedInAt.getTime()) / 60000))
            : null,
          earlyDepartureMinutes,
        },
      });
    }
    const attendanceRecord = await tx.candidateVisit.findFirst({
      where: { organizationId: data.organizationId, interviewId: current.id },
    });
    if (attendanceRecord) {
      const attendanceAction =
        data.direction === "CHECK_IN"
          ? "CANDIDATE_ATTENDANCE_CHECKED_IN"
          : "CANDIDATE_ATTENDANCE_CHECKED_OUT";
      await tx.candidateActivity.create({
        data: {
          organizationId: data.organizationId,
          candidateId: current.candidateId,
          actorUserId: data.actorUserId,
          action: attendanceAction,
          metadata: { visitId: attendanceRecord.id, interviewId: current.id },
        },
      });
      await writeAuditEvent(tx, {
        organizationId: data.organizationId,
        actorUserId: data.actorUserId,
        action: attendanceAction,
        entityType: "CandidateVisit",
        entityId: attendanceRecord.id,
        requestId: data.requestId,
        metadata: { candidateId: current.candidateId, interviewId: current.id },
      });
    }
    await tx.interviewActivity.create({
      data: {
        organizationId: data.organizationId,
        interviewId: current.id,
        actorUserId: data.actorUserId,
        action: data.direction === "CHECK_IN" ? "INTERVIEW_CHECKED_IN" : "INTERVIEW_CHECKED_OUT",
      },
    });
    await writeAuditEvent(tx, {
      organizationId: data.organizationId,
      actorUserId: data.actorUserId,
      action: data.direction === "CHECK_IN" ? "INTERVIEW_CHECKED_IN" : "INTERVIEW_CHECKED_OUT",
      entityType: "Interview",
      entityId: current.id,
      requestId: data.requestId,
    });
    return updated;
  });
}

export async function submitEvaluation(data: {
  organizationId: string;
  actorUserId: string;
  id: string;
  templateId?: string;
  scores: Record<string, number>;
  comments?: string;
  recommendation?: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const interview = await tx.interview.findFirst({
      where: { id: data.id, organizationId: data.organizationId },
    });
    const participant = await tx.interviewParticipant.findFirst({
      where: {
        interviewId: data.id,
        organizationId: data.organizationId,
        userId: data.actorUserId,
      },
    });
    if (!interview || !participant)
      throw new AppError(
        "FORBIDDEN",
        "Only an assigned interviewer may submit this evaluation",
        403,
      );
    const existing = await tx.interviewEvaluation.findUnique({
      where: {
        interviewId_interviewerId: { interviewId: data.id, interviewerId: data.actorUserId },
      },
    });
    if (existing?.status === "SUBMITTED")
      throw new AppError("CONFLICT", "This evaluation has already been submitted", 409);
    const templateId = data.templateId || interview.templateId || undefined;
    const template = templateId
      ? await tx.interviewTemplate.findFirst({
          where: { id: templateId, organizationId: data.organizationId, status: "ACTIVE" },
        })
      : null;
    if (templateId && !template)
      throw new AppError("NOT_FOUND", "Interview template was not found", 404);
    if (template) {
      const questions = Array.isArray(template.questions)
        ? template.questions.filter(
            (question): question is { id: string } =>
              typeof question === "object" &&
              question !== null &&
              "id" in question &&
              typeof question.id === "string",
          )
        : [];
      const questionIds = new Set(questions.map((question) => question.id));
      const scoreIds = Object.keys(data.scores);
      if (
        questions.length === 0 ||
        scoreIds.length !== questionIds.size ||
        scoreIds.some((id) => !questionIds.has(id))
      )
        throw new AppError(
          "VALIDATION_ERROR",
          "Scores must include exactly the questions from the interview template",
          422,
        );
    }
    const evaluation = await tx.interviewEvaluation.upsert({
      where: {
        interviewId_interviewerId: { interviewId: data.id, interviewerId: data.actorUserId },
      },
      update: {
        templateId,
        scores: data.scores as Prisma.InputJsonValue,
        comments: data.comments || null,
        recommendation: data.recommendation,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
      create: {
        organizationId: data.organizationId,
        interviewId: data.id,
        interviewerId: data.actorUserId,
        templateId,
        scores: data.scores as Prisma.InputJsonValue,
        comments: data.comments || null,
        recommendation: data.recommendation,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });
    await tx.interviewActivity.create({
      data: {
        organizationId: data.organizationId,
        interviewId: data.id,
        actorUserId: data.actorUserId,
        action: "INTERVIEW_EVALUATION_SUBMITTED",
        metadata: { evaluationId: evaluation.id, recommendation: data.recommendation },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: data.organizationId,
      actorUserId: data.actorUserId,
      action: "INTERVIEW_EVALUATION_SUBMITTED",
      entityType: "InterviewEvaluation",
      entityId: evaluation.id,
      requestId: data.requestId,
      metadata: { interviewId: data.id },
    });
    return evaluation;
  });
}

export async function createInterviewTemplate(data: {
  organizationId: string;
  actorUserId: string;
  name: string;
  description?: string;
  questions: unknown;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const template = await tx.interviewTemplate.create({
      data: {
        organizationId: data.organizationId,
        createdByUserId: data.actorUserId,
        name: data.name,
        description: data.description || undefined,
        questions: data.questions as Prisma.InputJsonValue,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: data.organizationId,
      actorUserId: data.actorUserId,
      action: "INTERVIEW_TEMPLATE_CREATED",
      entityType: "InterviewTemplate",
      entityId: template.id,
      requestId: data.requestId,
    });
    return template;
  });
}

export async function createInterviewAvailability(data: {
  organizationId: string;
  actorUserId: string;
  userId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const member = await tx.membership.findUnique({
      where: {
        organizationId_userId: { organizationId: data.organizationId, userId: data.userId },
      },
    });
    if (!member || member.status !== "ACTIVE")
      throw new AppError(
        "VALIDATION_ERROR",
        "Availability user is not an active organization member",
        422,
      );
    const availability = await tx.interviewAvailability.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        timezone: data.timezone,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: data.organizationId,
      actorUserId: data.actorUserId,
      action: "INTERVIEW_AVAILABILITY_CREATED",
      entityType: "InterviewAvailability",
      entityId: availability.id,
      requestId: data.requestId,
    });
    return availability;
  });
}
