import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseQuery } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_ATTENDANCE_PERMISSIONS } from "@/modules/employee-attendance/constants";
import { attendanceCalendarSchema } from "@/modules/employee-attendance/schemas";
import { attendanceCalendar } from "@/modules/employee-attendance/service";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_ATTENDANCE_PERMISSIONS.read);
    const query = parseQuery(attendanceCalendarSchema, request.nextUrl.searchParams);
    return successResponse(await attendanceCalendar(context.organizationId, query), id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
