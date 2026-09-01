import { NextRequest } from "next/server";
import { errorResponse, notFoundError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { findCandidateMatch } from "@/modules/candidates/repository";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(context.session.user.id, context.organizationId, CANDIDATE_PERMISSIONS.read);
    const candidate = await findCandidateMatch(context.organizationId, request.nextUrl.searchParams.get("identifier") || "");
    if (!candidate) throw notFoundError();
    const requisitionId = request.nextUrl.searchParams.get("requisitionId")?.trim();
    const source = request.nextUrl.searchParams.get("source") === "ONLINE" ? "ONLINE" : "WALK_IN";
    const previousSubmission = requisitionId ? await db.candidateSubmission.findFirst({ where: { candidateId: candidate.id, source, application: { is: { requisitionId } } }, select: { id: true } }) : null;
    return successResponse({ ...candidate, duplicateSubmission: Boolean(previousSubmission) }, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
