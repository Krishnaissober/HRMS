import { NextRequest } from "next/server";
import { recordAuditEvent } from "@/lib/audit";
import { errorResponse, notFoundError, validationError } from "@/lib/errors";
import { emailProvider } from "@/lib/notifications";
import { requestId, successResponse } from "@/lib/request";
import { requirePermission } from "@/lib/rbac";
import { parseBody } from "@/lib/validate";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { candidateDecisionEmailSchema } from "@/modules/candidates/schemas";
import { getCandidate } from "@/modules/candidates/repository";
import { getAuthenticatedContext } from "@/lib/tenant";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      CANDIDATE_PERMISSIONS.update,
    );
    const input = parseBody(candidateDecisionEmailSchema, await request.json());
    const candidate = await getCandidate(context.organizationId, (await params).id);
    if (!candidate) return errorResponse(notFoundError(), id);
    if (candidate.status !== input.status)
      throw validationError({ status: ["The candidate status changed; refresh and try again"] });
    if (!candidate.email) throw validationError({ email: ["The candidate has no email address"] });

    await emailProvider().send({
      recipient: candidate.email,
      subject:
        input.status === "SHORTLISTED"
          ? "Your application has been shortlisted"
          : "Update on your application",
      body:
        input.status === "SHORTLISTED"
          ? `Hello ${candidate.firstName},\n\nWe are pleased to let you know that your application for the ${candidate.roleOfInterest || "position"} opportunity has been shortlisted. Our HR team will contact you with the next steps.\n\nRegards,\nTriple Minds HR Team`
          : `Hello ${candidate.firstName},\n\nThank you for your interest in the ${candidate.roleOfInterest || "position"} opportunity. After careful consideration, we will not be moving forward with your application at this time. We appreciate the time you invested in the process.\n\nRegards,\nTriple Minds HR Team`,
      template: input.status === "SHORTLISTED" ? "CANDIDATE_SHORTLISTED" : "CANDIDATE_REJECTED",
    });
    await recordAuditEvent({
      organizationId: context.organizationId,
      actorUserId: context.session.user.id,
      action: "CANDIDATE_DECISION_EMAIL_SENT",
      entityType: "Candidate",
      entityId: candidate.id,
      requestId: id,
      metadata: { decision: input.status },
    });
    return successResponse({ sent: true }, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
