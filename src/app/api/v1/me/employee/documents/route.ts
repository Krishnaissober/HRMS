import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { listSelfServiceDocuments } from "@/modules/employees/service";

export async function GET(request: NextRequest) { const id = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_PERMISSIONS.selfRead); return successResponse(await listSelfServiceDocuments({ organizationId: context.organizationId, userEmail: context.session.user.email }), id); } catch (error) { return errorResponse(error, id); } }
