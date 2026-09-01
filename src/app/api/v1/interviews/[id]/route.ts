import { NextRequest } from "next/server";
import { errorResponse, notFoundError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { INTERVIEW_PERMISSIONS } from "@/modules/interviews/constants";
import { interviewUpdateSchema } from "@/modules/interviews/schemas";
import { updateInterview } from "@/modules/interviews/service";
import { getInterview } from "@/modules/interviews/repository";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(context.session.user.id, context.organizationId, INTERVIEW_PERMISSIONS.read);
    const interview = await getInterview(context.organizationId, (await params).id);
    if (!interview) throw notFoundError();
    return successResponse(interview, id);
  } catch (error) { return errorResponse(error, id); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(context.session.user.id, context.organizationId, INTERVIEW_PERMISSIONS.update);
    const parsed = parseBody(interviewUpdateSchema, await request.json());
    const interview = await updateInterview({ organizationId: context.organizationId, actorUserId: context.session.user.id, id: (await params).id, patch: parsed, requestId: id });
    if (!interview) throw notFoundError();
    return successResponse(interview, id);
  } catch (error) { return errorResponse(error, id); }
}
