import { NextRequest } from "next/server";
import { errorResponse, forbiddenError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { hasPermission } from "@/lib/rbac";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { statusUpdateSchema } from "@/modules/candidates/schemas";
import { changeCandidateStatus } from "@/modules/candidates/service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    const canUpdateStatus = await hasPermission(context.session.user.id, context.organizationId, CANDIDATE_PERMISSIONS.statusUpdate);
    const canUpdateCandidate = await hasPermission(context.session.user.id, context.organizationId, CANDIDATE_PERMISSIONS.update);
    if (!canUpdateStatus && !canUpdateCandidate) throw forbiddenError();
    const parsed = parseBody(statusUpdateSchema, await request.json());
    const candidate = await changeCandidateStatus({ organizationId: context.organizationId, actorUserId: context.session.user.id, id: (await params).id, ...parsed, requestId: id });
    return successResponse(candidate, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
