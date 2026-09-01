import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { PAYROLL_PERMISSIONS as P } from "@/modules/payroll/constants";
import { payrollStateSchema } from "@/modules/payroll/schemas";
import { setRunState } from "@/modules/payroll/service";
export async function PATCH(r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rid = requestId(r);
  try {
    const c = await getAuthenticatedContext(r),
      body = parseBody(payrollStateSchema, await r.json());
    await requirePermission(
      c.session.user.id,
      c.organizationId,
      body.status === "PREPARED"
        ? P.payrollManage
        : body.status === "REVIEWED"
          ? P.payrollReview
          : P.payrollApprove,
    );
    return successResponse(
      await setRunState({
        organizationId: c.organizationId,
        actorUserId: c.session.user.id,
        id: (await params).id,
        ...body,
        requestId: rid,
      }),
      rid,
    );
  } catch (e) {
    return errorResponse(e, rid);
  }
}
