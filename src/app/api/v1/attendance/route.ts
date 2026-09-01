import { NextRequest } from "next/server";
import { requestId, successResponse } from "@/lib/request";
import { errorResponse } from "@/lib/errors";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { parseQuery } from "@/lib/validate";
import { ATTENDANCE_PERMISSIONS } from "@/modules/attendance/constants";
import { attendanceListSchema } from "@/modules/attendance/schemas";
import { listVisits } from "@/modules/attendance/service";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, ATTENDANCE_PERMISSIONS.read); return successResponse(await listVisits(context.organizationId, parseQuery(attendanceListSchema, request.nextUrl.searchParams)), id); } catch (error) { return errorResponse(error, id); }
}
