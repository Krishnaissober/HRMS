import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { createCandidateCompletionLink } from "@/modules/candidates/completion";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, CANDIDATE_PERMISSIONS.update); const result = await createCandidateCompletionLink({ organizationId: context.organizationId, candidateId: (await params).id, actorUserId: context.session.user.id, requestId: id }); return successResponse({ ...result, url: `${request.nextUrl.origin}/candidate-completion/${result.token}` }, id, { status: 201 }); } catch (error) { return errorResponse(error, id); }
}
