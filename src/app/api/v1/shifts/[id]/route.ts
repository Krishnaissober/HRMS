import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_ATTENDANCE_PERMISSIONS } from "@/modules/employee-attendance/constants";
import { shiftUpdateSchema } from "@/modules/employee-attendance/schemas";
import { updateShift } from "@/modules/employee-attendance/service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const id = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_ATTENDANCE_PERMISSIONS.shiftsManage); const parsed = parseBody(shiftUpdateSchema, await request.json()); return successResponse(await updateShift({ organizationId: context.organizationId, actorUserId: context.session.user.id, id: (await params).id, patch: parsed, requestId: id }), id); } catch (error) { return errorResponse(error, id); } }
