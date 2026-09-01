import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody, parseQuery } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { authenticatedCandidateSchema, candidateListSchema } from "@/modules/candidates/schemas";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { listCandidates } from "@/modules/candidates/repository";
import { submitAuthenticatedCandidate } from "@/modules/candidates/service";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(context.session.user.id, context.organizationId, CANDIDATE_PERMISSIONS.read);
    const query = parseQuery(candidateListSchema, request.nextUrl.searchParams);
    const result = await listCandidates(context.organizationId, query);
    return successResponse({ ...result, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(result.total / query.pageSize) }, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(context.session.user.id, context.organizationId, CANDIDATE_PERMISSIONS.create);
    const parsed = parseBody(authenticatedCandidateSchema, await request.json());
    const { documents, ...fields } = parsed;
    const result = await submitAuthenticatedCandidate({ organizationId: context.organizationId, actorUserId: context.session.user.id, source: parsed.source, fields, documents, requestId: id });
    return successResponse({ referenceNo: result.submission.referenceNo, candidateId: result.candidate.id, duplicateMatched: result.duplicateMatched }, id, { status: 201 });
  } catch (error) {
    return errorResponse(error, id);
  }
}
