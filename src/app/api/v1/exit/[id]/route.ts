import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { getExitCase } from "@/modules/employees/service";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rid = requestId(request);
  try {
    const c = await getAuthenticatedContext(request);
    await requirePermission(c.session.user.id, c.organizationId, EMPLOYEE_PERMISSIONS.exitRead);
    return successResponse(await getExitCase(c.organizationId, (await params).id), rid);
  } catch (e) {
    return errorResponse(e, rid);
  }
}
