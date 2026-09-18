import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { requirePermission } from "@/lib/rbac";
import { getAuthenticatedContext } from "@/lib/tenant";
import { parseBody } from "@/lib/validate";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { onboardingArchiveSchema } from "@/modules/employees/schemas";
import { archiveOnboarding, getOnboardingProgress } from "@/modules/employees/service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      EMPLOYEE_PERMISSIONS.onboardingRead,
    );
    const result = await getOnboardingProgress(context.organizationId, (await params).id);
    return successResponse(result, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      EMPLOYEE_PERMISSIONS.onboardingManage,
    );
    const body = parseBody(onboardingArchiveSchema, await request.json());
    return successResponse(
      await archiveOnboarding({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        id: (await params).id,
        reason: body.reason,
        requestId: id,
      }),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
