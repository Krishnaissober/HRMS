import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { accessCreateSchema } from "@/modules/employees/schemas";
import { provisionAccess } from "@/modules/employees/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const id = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_PERMISSIONS.accessManage); const parsed = parseBody(accessCreateSchema, await request.json()); return successResponse(await provisionAccess({ organizationId: context.organizationId, actorUserId: context.session.user.id, employeeId: (await params).id, ...parsed, requestId: id }), id, { status: 201 }); } catch (error) { return errorResponse(error, id); } }
