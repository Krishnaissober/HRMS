import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { INTERVIEW_PERMISSIONS } from "@/modules/interviews/constants";
import { interviewEvaluationSchema } from "@/modules/interviews/schemas";
import { submitInterviewEvaluation } from "@/modules/interviews/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      INTERVIEW_PERMISSIONS.evaluate,
    );
    const parsed = parseBody(interviewEvaluationSchema, await request.json());
    const evaluation = await submitInterviewEvaluation({
      organizationId: context.organizationId,
      actorUserId: context.session.user.id,
      id: (await params).id,
      ...parsed,
      requestId: id,
    });
    return successResponse(evaluation, id, { status: 201 });
  } catch (error) {
    return errorResponse(error, id);
  }
}
