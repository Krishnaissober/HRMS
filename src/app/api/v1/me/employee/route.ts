import { NextRequest } from "next/server";
import { errorResponse, notFoundError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { selfServiceProfileSchema } from "@/modules/employees/schemas";
import { getSelfServiceEmployee, updateSelfServiceEmployee } from "@/modules/employees/service";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      EMPLOYEE_PERMISSIONS.selfRead,
    );
    const employee = await getSelfServiceEmployee({
      organizationId: context.organizationId,
      userEmail: context.session.user.email,
    });
    if (!employee) throw notFoundError();
    return successResponse(employee, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
export async function PATCH(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      EMPLOYEE_PERMISSIONS.selfUpdate,
    );
    const parsed = parseBody(selfServiceProfileSchema, await request.json());
    return successResponse(
      await updateSelfServiceEmployee({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        userEmail: context.session.user.email,
        patch: parsed,
        requestId: id,
      }),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
