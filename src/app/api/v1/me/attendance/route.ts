import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseQuery } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_ATTENDANCE_PERMISSIONS } from "@/modules/employee-attendance/constants";
import { attendanceListSchema } from "@/modules/employee-attendance/schemas";
import { listSelfAttendance } from "@/modules/employee-attendance/service";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      EMPLOYEE_ATTENDANCE_PERMISSIONS.read,
    );
    return successResponse(
      await listSelfAttendance({
        organizationId: context.organizationId,
        userEmail: context.session.user.email,
        query: parseQuery(attendanceListSchema, request.nextUrl.searchParams),
      }),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
