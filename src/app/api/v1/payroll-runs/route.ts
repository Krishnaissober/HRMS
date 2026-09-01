import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { PAYROLL_PERMISSIONS as P } from "@/modules/payroll/constants";
import { payrollRunSchema } from "@/modules/payroll/schemas";
import { createRun, listRuns } from "@/modules/payroll/service";
export async function GET(r: NextRequest) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(c.session.user.id, c.organizationId, P.payrollRead);
    return successResponse(await listRuns(c.organizationId), id);
  } catch (e) {
    return errorResponse(e, id);
  }
}
export async function POST(r: NextRequest) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(c.session.user.id, c.organizationId, P.payrollManage);
    return successResponse(
      await createRun({
        organizationId: c.organizationId,
        actorUserId: c.session.user.id,
        ...parseBody(payrollRunSchema, await r.json()),
        requestId: id,
      }),
      id,
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e, id);
  }
}
