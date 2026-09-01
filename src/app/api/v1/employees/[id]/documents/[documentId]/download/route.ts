import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { getDocumentUrl } from "@/modules/employees/service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) { const id = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_PERMISSIONS.documentsRead); const values = await params; return NextResponse.redirect((await getDocumentUrl({ organizationId: context.organizationId, actorUserId: context.session.user.id, employeeId: values.id, id: values.documentId, requestId: id })).url); } catch (error) { return errorResponse(error, id); } }
