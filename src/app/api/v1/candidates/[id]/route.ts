import { NextRequest } from "next/server";
import { errorResponse, notFoundError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { getCandidate, updateCandidateDetails } from "@/modules/candidates/repository";
import { candidateUpdateSchema } from "@/modules/candidates/schemas";
import { parseBody } from "@/lib/validate";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      CANDIDATE_PERMISSIONS.read,
    );
    const candidate = await getCandidate(context.organizationId, (await params).id);
    if (!candidate) return errorResponse(notFoundError(), id);
    return successResponse(candidate, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      CANDIDATE_PERMISSIONS.update,
    );
    const values = await params;
    const parsed = parseBody(candidateUpdateSchema, await request.json());
    const candidate = await updateCandidateDetails(
      context.organizationId,
      values.id,
      parsed,
      context.session.user.id,
      id,
    );
    if (!candidate) return errorResponse(notFoundError(), id);
    return successResponse(candidate, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
