import { NextRequest } from "next/server";
import { requestId, successResponse } from "@/lib/request";
import { errorResponse } from "@/lib/errors";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { parseBody } from "@/lib/validate";
import { ATTENDANCE_PERMISSIONS } from "@/modules/attendance/constants";
import { attendanceExceptionSchema } from "@/modules/attendance/schemas";
import { recordAttendanceException } from "@/modules/attendance/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      ATTENDANCE_PERMISSIONS.exceptions,
    );
    const parsed = parseBody(attendanceExceptionSchema, await request.json());
    return successResponse(
      await recordAttendanceException({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        visitId: (await params).id,
        exceptionType: parsed.exceptionType,
        notes: parsed.notes,
        requestId: id,
      }),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
