import { AppError, notFoundError, validationError } from "@/lib/errors";
import { writeAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { createCandidateCompletionLink } from "@/modules/candidates/completion";

const reviewInclude = {
  submissions: {
    orderBy: { submittedAt: "desc" as const },
    take: 1,
  },
  documents: { orderBy: { createdAt: "desc" as const } },
  applications: { include: { requisition: true } },
  interviews: {
    orderBy: { scheduledStart: "asc" as const },
    include: {
      evaluations: {
        include: { interviewer: { select: { id: true, name: true, email: true } } },
      },
      participants: { include: { user: { select: { id: true, name: true, email: true } } } },
      activities: {
        orderBy: { createdAt: "desc" as const },
        include: { actor: { select: { id: true, name: true, email: true } } },
      },
    },
  },
  activities: {
    orderBy: { createdAt: "desc" as const },
    include: { actor: { select: { id: true, name: true, email: true } } },
  },
} as const;

async function getCandidateForApproval(organizationId: string, candidateId: string) {
  return db.candidate.findFirst({
    where: { id: candidateId, organizationId },
    include: reviewInclude,
  });
}

function assertInterviewPackage(
  candidate: Awaited<ReturnType<typeof getCandidateForApproval>>,
): asserts candidate is NonNullable<Awaited<ReturnType<typeof getCandidateForApproval>>> {
  if (!candidate) throw notFoundError();
  if (candidate.status !== "SHORTLISTED")
    throw new AppError(
      "CONFLICT",
      "Only a shortlisted candidate can be sent to Master review",
      409,
    );
  const onlineComplete = candidate.interviews.some(
    (interview) => interview.stage === "ONLINE" && interview.status === "COMPLETED",
  );
  const remoteOnlineComplete = candidate.interviews.some(
    (interview) =>
      interview.stage === "ONLINE" &&
      interview.status === "COMPLETED" &&
      (interview.mode === "VIDEO" || interview.mode === "PHONE"),
  );
  const physicalComplete = candidate.interviews.some(
    (interview) =>
      interview.stage === "PHYSICAL" &&
      interview.mode === "IN_PERSON" &&
      interview.status === "COMPLETED",
  );
  const interviewPathComplete =
    onlineComplete && remoteOnlineComplete ? physicalComplete : onlineComplete || physicalComplete;
  if (!interviewPathComplete || !candidate.hrReviewedAt)
    throw new AppError(
      "CONFLICT",
      "Complete the required interview path and HR evaluation before sending this candidate to Master review",
      409,
    );
}

export async function requestMasterHiringReview(input: {
  organizationId: string;
  actorUserId: string;
  candidateId: string;
  requestId?: string;
}) {
  const candidate = await getCandidateForApproval(input.organizationId, input.candidateId);
  assertInterviewPackage(candidate);
  if (candidate.hiringApprovalStatus !== "NOT_REQUESTED")
    throw validationError({
      status: ["This candidate already has a Master review outcome or request"],
    });
  const now = new Date();
  return db.$transaction(async (tx) => {
    const transition = await tx.candidate.updateMany({
      where: {
        id: input.candidateId,
        organizationId: input.organizationId,
        hiringApprovalStatus: "NOT_REQUESTED",
      },
      data: {
        // Sending the completed shortlist package starts the Master review stage.
        // Keep approval state separate, but expose this controlled pipeline transition
        // as Under Review in the HR workspace.
        status: "SCREENING",
        hiringApprovalStatus: "AWAITING_MASTER_REVIEW",
        hiringApprovalRequestedAt: now,
        hiringApprovalRequestedByUserId: input.actorUserId,
      },
    });
    if (transition.count !== 1)
      throw new AppError("CONFLICT", "This candidate was already sent to Master review", 409);
    await tx.candidateActivity.create({
      data: {
        organizationId: input.organizationId,
        candidateId: input.candidateId,
        actorUserId: input.actorUserId,
        action: "SENT_TO_MASTER_FOR_REVIEW",
        fromStatus: candidate.status,
        toStatus: "SCREENING",
        note: "HR sent the completed hiring package to Master Admin",
        metadata: { approvalStatus: "AWAITING_MASTER_REVIEW" },
      },
    });
    await tx.application.updateMany({
      where: { organizationId: input.organizationId, candidateId: input.candidateId },
      data: { status: "SCREENING" },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "CANDIDATE_SENT_TO_MASTER_FOR_REVIEW",
      entityType: "Candidate",
      entityId: input.candidateId,
      requestId: input.requestId,
    });
    return tx.candidate.findUniqueOrThrow({ where: { id: input.candidateId } });
  });
}

export async function decideMasterHiringReview(input: {
  organizationId: string;
  actorUserId: string;
  candidateId: string;
  decision: "APPROVED" | "REJECTED";
  remarks?: string;
  requestId?: string;
}) {
  if (input.decision === "REJECTED" && !input.remarks?.trim())
    throw validationError({ remarks: ["A reason is required when rejecting hiring"] });
  return db.$transaction(async (tx) => {
    const candidate = await tx.candidate.findFirst({
      where: { id: input.candidateId, organizationId: input.organizationId },
    });
    if (!candidate) throw notFoundError();
    if (candidate.hiringApprovalStatus !== "AWAITING_MASTER_REVIEW")
      throw new AppError("CONFLICT", "Only candidates awaiting Master review can be decided", 409);
    const now = new Date();
    const approvalStatus = input.decision === "APPROVED" ? "MASTER_APPROVED" : "MASTER_REJECTED";
    const transition = await tx.candidate.updateMany({
      where: {
        id: candidate.id,
        organizationId: input.organizationId,
        hiringApprovalStatus: "AWAITING_MASTER_REVIEW",
      },
      data: {
        hiringApprovalStatus: approvalStatus,
        masterDecisionAt: now,
        masterDecisionByUserId: input.actorUserId,
        masterDecisionReason: input.remarks?.trim() || null,
      },
    });
    if (transition.count !== 1)
      throw new AppError("CONFLICT", "This Master review was already decided", 409);
    await tx.candidateActivity.create({
      data: {
        organizationId: input.organizationId,
        candidateId: candidate.id,
        actorUserId: input.actorUserId,
        action: "MASTER_HIRING_DECISION_RECORDED",
        note: input.remarks?.trim(),
        metadata: { decision: input.decision, approvalStatus },
      },
    });
    if (candidate.hiringApprovalRequestedByUserId) {
      await tx.appNotification.create({
        data: {
          organizationId: input.organizationId,
          userId: candidate.hiringApprovalRequestedByUserId,
          eventType: "MASTER_HIRING_DECISION",
          title:
            input.decision === "APPROVED" ? "Master approved hiring" : "Master rejected hiring",
          body: `${candidate.firstName} ${candidate.lastName} requires the final HR decision`,
          actionableUrl: `/hr/candidates/${candidate.id}`,
          channels: ["IN_APP"],
        },
      });
    }
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "MASTER_HIRING_DECISION_RECORDED",
      entityType: "Candidate",
      entityId: candidate.id,
      requestId: input.requestId,
      metadata: { decision: input.decision, approvalStatus },
    });
    return tx.candidate.findUniqueOrThrow({ where: { id: candidate.id } });
  });
}

export async function finalizeHiringDecision(input: {
  organizationId: string;
  actorUserId: string;
  candidateId: string;
  decision: "HIRE" | "REJECT";
  remarks?: string;
  requestId?: string;
}) {
  if (input.decision === "REJECT" && !input.remarks?.trim())
    throw validationError({ remarks: ["A reason is required when rejecting the candidate"] });
  const result = await db.$transaction(async (tx) => {
    const candidate = await tx.candidate.findFirst({
      where: { id: input.candidateId, organizationId: input.organizationId },
    });
    if (!candidate) throw notFoundError();
    const canHire = candidate.hiringApprovalStatus === "MASTER_APPROVED";
    const canReject = ["MASTER_APPROVED", "MASTER_REJECTED"].includes(
      candidate.hiringApprovalStatus,
    );
    if ((input.decision === "HIRE" && !canHire) || (input.decision === "REJECT" && !canReject))
      throw new AppError(
        "CONFLICT",
        "The final HR action is not available for this candidate's Master decision",
        409,
      );
    const approvalStatus = input.decision === "HIRE" ? "FINAL_HIRED" : "FINAL_REJECTED";
    const status = input.decision === "HIRE" ? "SELECTED" : "REJECTED";
    const now = new Date();
    const transition = await tx.candidate.updateMany({
      where: {
        id: candidate.id,
        organizationId: input.organizationId,
        hiringApprovalStatus: candidate.hiringApprovalStatus,
      },
      data: {
        status,
        hiringApprovalStatus: approvalStatus,
        finalDecisionAt: now,
        finalDecisionByUserId: input.actorUserId,
        finalDecisionReason: input.remarks?.trim() || null,
        statusReason: input.remarks?.trim() || null,
      },
    });
    if (transition.count !== 1)
      throw new AppError("CONFLICT", "The final HR decision was already recorded", 409);
    await tx.application.updateMany({
      where: { organizationId: input.organizationId, candidateId: candidate.id },
      data: { status },
    });
    await tx.candidateActivity.create({
      data: {
        organizationId: input.organizationId,
        candidateId: candidate.id,
        actorUserId: input.actorUserId,
        action: input.decision === "HIRE" ? "CANDIDATE_HIRED" : "CANDIDATE_FINAL_REJECTED",
        fromStatus: candidate.status,
        toStatus: status,
        note: input.remarks?.trim(),
        metadata: { approvalStatus, decision: input.decision },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.decision === "HIRE" ? "CANDIDATE_HIRED" : "CANDIDATE_FINAL_REJECTED",
      entityType: "Candidate",
      entityId: candidate.id,
      requestId: input.requestId,
      metadata: { approvalStatus },
    });
    return tx.candidate.findUniqueOrThrow({ where: { id: candidate.id } });
  });
  if (input.decision === "HIRE") {
    try {
      await createCandidateCompletionLink({
        organizationId: input.organizationId,
        candidateId: input.candidateId,
        actorUserId: input.actorUserId,
        requestId: input.requestId,
      });
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== "CONFLICT") throw error;
    }
  }
  return result;
}

export async function listMasterHiringReviews(organizationId: string) {
  return db.candidate.findMany({
    where: { organizationId, hiringApprovalStatus: "AWAITING_MASTER_REVIEW" },
    orderBy: { hiringApprovalRequestedAt: "asc" },
    include: {
      applications: { include: { requisition: true } },
      interviews: {
        orderBy: { scheduledStart: "asc" },
        include: {
          evaluations: {
            include: { interviewer: { select: { id: true, name: true, email: true } } },
          },
          participants: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
    },
  });
}

export async function getMasterHiringReview(organizationId: string, candidateId: string) {
  return getCandidateForApproval(organizationId, candidateId);
}
