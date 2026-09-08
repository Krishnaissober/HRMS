import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_ATTENDANCE_PERMISSIONS } from "@/modules/employee-attendance/constants";
import { holidaySchema } from "@/modules/employee-attendance/schemas";
import { listHolidays } from "@/modules/employee-attendance/repository";
import { createHoliday } from "@/modules/employee-attendance/service";

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
      await listHolidays(
        context.organizationId,
        request.nextUrl.searchParams.get("from") || undefined,
        request.nextUrl.searchParams.get("to") || undefined,
      ),
      id,
    );
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
      EMPLOYEE_ATTENDANCE_PERMISSIONS.holidaysManage,
    );
    const parsed = parseBody(holidaySchema, await request.json());
    return successResponse(
      await createHoliday({
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
