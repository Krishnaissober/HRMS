import { NextRequest } from "next/server";
import { errorResponse, notFoundError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { db } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const id = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_PERMISSIONS.historyRead); const employeeId = (await params).id; const employee = await db.employee.findFirst({ where: { id: employeeId, organizationId: context.organizationId } }); if (!employee) throw notFoundError(); return successResponse(await db.employeeHistory.findMany({ where: { employeeId, organizationId: context.organizationId }, orderBy: { effectiveDate: "desc" }, include: { actor: { select: { id: true, name: true, email: true } } } }), id); } catch (error) { return errorResponse(error, id); } }
