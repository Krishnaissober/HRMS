import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_ATTENDANCE_PERMISSIONS } from "@/modules/employee-attendance/constants";
import { listCorrections } from "@/modules/employee-attendance/repository";

export async function GET(request: NextRequest) { const id = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_ATTENDANCE_PERMISSIONS.manage); return successResponse(await listCorrections(context.organizationId, request.nextUrl.searchParams.get("employeeId") || undefined), id); } catch (error) { return errorResponse(error, id); } }
