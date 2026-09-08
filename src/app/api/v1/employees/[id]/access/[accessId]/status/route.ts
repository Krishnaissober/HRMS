import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { accessStatusSchema } from "@/modules/employees/schemas";
import { changeAccessStatus } from "@/modules/employees/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accessId: string }> },
) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      EMPLOYEE_PERMISSIONS.accessManage,
    );
    const parsed = parseBody(accessStatusSchema, await request.json());
    return successResponse(
      await changeAccessStatus({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        id: (await params).accessId,
        ...parsed,
        requestId: id,
      }),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
