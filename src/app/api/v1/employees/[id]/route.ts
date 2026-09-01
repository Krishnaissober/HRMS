import { NextRequest } from "next/server";
import { errorResponse, notFoundError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { employeeUpdateSchema } from "@/modules/employees/schemas";
import { getEmployee } from "@/modules/employees/repository";
import { updateEmployee } from "@/modules/employees/service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const id = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_PERMISSIONS.read); const employee = await getEmployee(context.organizationId, (await params).id); if (!employee) throw notFoundError(); return successResponse(employee, id); } catch (error) { return errorResponse(error, id); } }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const id = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_PERMISSIONS.update); const parsed = parseBody(employeeUpdateSchema, await request.json()); return successResponse(await updateEmployee({ organizationId: context.organizationId, actorUserId: context.session.user.id, id: (await params).id, patch: parsed, requestId: id }), id); } catch (error) { return errorResponse(error, id); } }
