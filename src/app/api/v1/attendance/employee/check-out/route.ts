import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_ATTENDANCE_PERMISSIONS } from "@/modules/employee-attendance/constants";
import { checkOutEmployee } from "@/modules/employee-attendance/service";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      EMPLOYEE_ATTENDANCE_PERMISSIONS.checkOut,
    );
    return successResponse(
      await checkOutEmployee({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        userEmail: context.session.user.email,
        requestId: id,
      }),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
