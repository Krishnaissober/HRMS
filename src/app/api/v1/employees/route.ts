import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseQuery } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { employeeListSchema } from "@/modules/employees/schemas";
import { listEmployees } from "@/modules/employees/repository";

export async function GET(request: NextRequest) { const id = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_PERMISSIONS.read); return successResponse(await listEmployees(context.organizationId, parseQuery(employeeListSchema, request.nextUrl.searchParams)), id); } catch (error) { return errorResponse(error, id); } }
