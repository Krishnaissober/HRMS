import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { PAYROLL_PERMISSIONS as P } from "@/modules/payroll/constants";
import { salarySchema } from "@/modules/payroll/schemas";
import { listSalary, saveSalary } from "@/modules/payroll/service";
export async function GET(r: NextRequest) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(c.session.user.id, c.organizationId, P.salaryRead);
    return successResponse(await listSalary(c.organizationId), id);
  } catch (e) {
    return errorResponse(e, id);
  }
}
export async function POST(r: NextRequest) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(c.session.user.id, c.organizationId, P.salaryManage);
    return successResponse(
      await saveSalary({
        organizationId: c.organizationId,
        actorUserId: c.session.user.id,
        ...parseBody(salarySchema, await r.json()),
        requestId: id,
      }),
      id,
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e, id);
  }
}
