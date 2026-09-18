import { NextRequest } from "next/server";
import { assessInterviewRatings } from "@/modules/candidates/constants";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { candidateHrReviewSchema } from "@/modules/candidates/schemas";
import { getCandidate } from "@/modules/candidates/repository";
import { db } from "@/lib/db";
import { AppError, errorResponse, notFoundError } from "@/lib/errors";
import { parseBody } from "@/lib/validate";
import { requestId, successResponse } from "@/lib/request";
import { writeAuditEvent } from "@/lib/audit";
import { canTransition, type CandidateStatus } from "@/modules/candidates/constants";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      CANDIDATE_PERMISSIONS.update,
    );
    const candidateId = (await params).id;
    const candidate = await getCandidate(context.organizationId, candidateId);
    if (!candidate) return errorResponse(notFoundError(), id);
    const completedInterview = candidate.interviews.some(
      (interview) => interview.status === "COMPLETED",
    );
    if (!completedInterview) {
      return errorResponse(
        new AppError(
          "CONFLICT",
          "Complete the scheduled interview before recording the HR evaluation",
          409,
        ),
        id,
      );
    }
    const input = parseBody(candidateHrReviewSchema, await request.json());
    const reviewed = await db.$transaction(async (tx) => {
      const current = await tx.candidate.findFirst({
        where: { id: candidateId, organizationId: context.organizationId },
      });
      if (!current) throw notFoundError();
      const completedInterview = await tx.interview.findFirst({
        where: {
          candidateId,
          organizationId: context.organizationId,
          status: "COMPLETED",
        },
        select: { id: true },
      });
      if (!completedInterview)
        throw new AppError(
          "CONFLICT",
          "Complete the scheduled interview before recording the HR evaluation",
          409,
        );
      // A completed interview unlocks the HR recommendation. This is not a
      // final hire decision; Master review and HR's final hire action remain separate.
      const reviewStatus = input.status;
      if (
        current.status !== reviewStatus &&
        !canTransition(current.status as CandidateStatus, reviewStatus as CandidateStatus)
      ) {
        throw new AppError(
          "CONFLICT",
          "This candidate's status no longer permits this review outcome. Refresh the page.",
          409,
        );
      }
      const updated = await tx.candidate.update({
        where: { id: candidateId },
        data: {
          status: reviewStatus,
          statusReason: input.comments,
          hrInterviewScheduledBy: context.session.user.name,
          hrInterviewerName: context.session.user.name,
          hrCommunicationRating: input.communicationRating || null,
          hrTechnicalSkillsRating: input.technicalSkillsRating || null,
          hrOverallFit: assessInterviewRatings(
            input.communicationRating,
            input.technicalSkillsRating,
          )!.overallFit,
          hrComments: input.comments || null,
          hrReviewedByUserId: context.session.user.id,
          hrReviewedAt: new Date(),
        },
      });
      await tx.candidateActivity.create({
        data: {
          organizationId: context.organizationId,
          candidateId,
          actorUserId: context.session.user.id,
          action: "HR_REVIEW_UPDATED",
          fromStatus: current.status,
          toStatus: reviewStatus,
          note: input.comments || undefined,
        },
      });
      await writeAuditEvent(tx, {
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        action: "CANDIDATE_HR_REVIEW_UPDATED",
        entityType: "Candidate",
        entityId: candidateId,
        requestId: id,
      });
      return updated;
    });
    return successResponse(reviewed, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
