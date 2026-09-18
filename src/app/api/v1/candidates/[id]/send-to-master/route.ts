import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { requestId, successResponse } from "@/lib/request";
import { requestMasterHiringReview } from "@/modules/hiring/approval";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      CANDIDATE_PERMISSIONS.update,
    );
    return successResponse(
      await requestMasterHiringReview({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        candidateId: (await params).id,
        requestId: id,
      }),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
