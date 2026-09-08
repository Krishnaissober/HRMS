import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { returnAsset } from "@/modules/employees/service";
import { z } from "zod";
const schema = z.object({ notes: z.string().trim().max(2000).optional() });
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const rid = requestId(request);
  try {
    const c = await getAuthenticatedContext(request);
    await requirePermission(c.session.user.id, c.organizationId, EMPLOYEE_PERMISSIONS.exitManage);
    const values = await params;
    const b = parseBody(schema, await request.json().catch(() => ({})));
    return successResponse(
      await returnAsset({
        organizationId: c.organizationId,
        actorUserId: c.session.user.id,
        employeeId: values.id,
        assetId: values.assetId,
        ...b,
        requestId: rid,
      }),
      rid,
    );
  } catch (e) {
    return errorResponse(e, rid);
  }
}
