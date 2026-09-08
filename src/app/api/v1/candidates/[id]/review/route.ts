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
    if (!candidate.interviews.some((interview) => interview.status === "COMPLETED")) {
      return errorResponse(
        new AppError(
          "CONFLICT",
          "HR review is available only after the interview is completed",
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
      const postInterviewShortlist =
        current.status === "INTERVIEW" && input.status === "SHORTLISTED";
      if (
        current.status !== input.status &&
        !postInterviewShortlist &&
        !canTransition(current.status as CandidateStatus, input.status)
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
          status: input.status,
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
          toStatus: input.status,
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
