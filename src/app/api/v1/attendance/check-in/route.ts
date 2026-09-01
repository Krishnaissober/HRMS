import { NextRequest } from "next/server";
import { requestId, successResponse } from "@/lib/request";
import { errorResponse } from "@/lib/errors";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { parseBody } from "@/lib/validate";
import { ATTENDANCE_PERMISSIONS } from "@/modules/attendance/constants";
import { attendanceCheckInSchema } from "@/modules/attendance/schemas";
import { checkInCandidate } from "@/modules/attendance/service";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, ATTENDANCE_PERMISSIONS.checkIn); const parsed = parseBody(attendanceCheckInSchema, await request.json()); return successResponse(await checkInCandidate({ organizationId: context.organizationId, actorUserId: context.session.user.id, ...parsed, requestId: id }), id); } catch (error) { return errorResponse(error, id); }
}
