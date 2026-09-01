import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { documentStatusSchema } from "@/modules/employees/schemas";
import { changeDocumentStatus } from "@/modules/employees/service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) { const requestIdValue = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_PERMISSIONS.documentsVerify); const parsed = parseBody(documentStatusSchema, await request.json()); const values = await params; return successResponse(await changeDocumentStatus({ organizationId: context.organizationId, actorUserId: context.session.user.id, employeeId: values.id, id: values.documentId, ...parsed, requestId: requestIdValue }), requestIdValue); } catch (error) { return errorResponse(error, requestIdValue); } }
