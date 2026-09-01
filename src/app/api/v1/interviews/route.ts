import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody, parseQuery } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { INTERVIEW_PERMISSIONS } from "@/modules/interviews/constants";
import { interviewCreateSchema, interviewListSchema } from "@/modules/interviews/schemas";
import { createInterview } from "@/modules/interviews/service";
import { listInterviews } from "@/modules/interviews/repository";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(context.session.user.id, context.organizationId, INTERVIEW_PERMISSIONS.read);
    const query = parseQuery(interviewListSchema, request.nextUrl.searchParams);
    const result = await listInterviews(context.organizationId, query);
    return successResponse({ ...result, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(result.total / query.pageSize) }, id);
  } catch (error) { return errorResponse(error, id); }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(context.session.user.id, context.organizationId, INTERVIEW_PERMISSIONS.create);
    const parsed = parseBody(interviewCreateSchema, await request.json());
    const interview = await createInterview({ organizationId: context.organizationId, actorUserId: context.session.user.id, ...parsed, requestId: id });
    return successResponse(interview, id, { status: 201 });
  } catch (error) { return errorResponse(error, id); }
}
