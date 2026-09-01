import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { documentSubmitSchema } from "@/modules/employees/schemas";
import { submitDocumentRequest } from "@/modules/employees/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) { const id = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_PERMISSIONS.selfUpdate); const parsed = parseBody(documentSubmitSchema, await request.json()); return successResponse(await submitDocumentRequest({ organizationId: context.organizationId, actorUserId: context.session.user.id, userEmail: context.session.user.email, id: (await params).documentId, ...parsed, requestId: id }), id); } catch (error) { return errorResponse(error, id); } }
