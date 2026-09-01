import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_ATTENDANCE_PERMISSIONS } from "@/modules/employee-attendance/constants";
import { attendanceExceptionSchema } from "@/modules/employee-attendance/schemas";
import { recordException } from "@/modules/employee-attendance/service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const id = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_ATTENDANCE_PERMISSIONS.manage); const parsed = parseBody(attendanceExceptionSchema, await request.json()); return successResponse(await recordException({ organizationId: context.organizationId, actorUserId: context.session.user.id, id: (await params).id, ...parsed, requestId: id }), id); } catch (error) { return errorResponse(error, id); } }
