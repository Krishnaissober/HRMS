import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { visitCheckInSchema } from "@/modules/candidates/schemas";
import { checkInCandidateVisit } from "@/modules/candidates/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(context.session.user.id, context.organizationId, CANDIDATE_PERMISSIONS.update);
    const parsed = parseBody(visitCheckInSchema, await request.json());
    const visit = await checkInCandidateVisit({ organizationId: context.organizationId, actorUserId: context.session.user.id, candidateId: (await params).id, ...parsed, requestId: id });
    return successResponse(visit, id, { status: 201 });
  } catch (error) { return errorResponse(error, id); }
}
