import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { templateCreateSchema } from "@/modules/employees/schemas";
import { listTemplates } from "@/modules/employees/repository";
import { createTemplate } from "@/modules/employees/service";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      EMPLOYEE_PERMISSIONS.onboardingRead,
    );
    return successResponse(await listTemplates(context.organizationId), id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      EMPLOYEE_PERMISSIONS.onboardingManage,
    );
    const parsed = parseBody(templateCreateSchema, await request.json());
    return successResponse(
      await createTemplate({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        ...parsed,
        requestId: id,
      }),
      id,
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
