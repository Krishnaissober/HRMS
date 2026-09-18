import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { listCandidateOnboarding } from "@/modules/candidates/completion";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      CANDIDATE_PERMISSIONS.read,
    );
    return successResponse(await listCandidateOnboarding(context.organizationId), id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
