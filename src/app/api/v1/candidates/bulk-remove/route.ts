import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { requirePermission } from "@/lib/rbac";
import { getAuthenticatedContext } from "@/lib/tenant";
import { parseBody } from "@/lib/validate";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { bulkCandidateRemovalSchema } from "@/modules/candidates/schemas";
import { removeCandidates } from "@/modules/candidates/service";

export async function DELETE(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      CANDIDATE_PERMISSIONS.update,
    );
    const body = parseBody(bulkCandidateRemovalSchema, await request.json());
    return successResponse(
      await removeCandidates({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        candidateIds: body.candidateIds,
        reason: body.reason,
        requestId: id,
      }),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
