import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { PAYROLL_PERMISSIONS as P } from "@/modules/payroll/constants";
import { expensePaymentSchema } from "@/modules/payroll/schemas";
import { payExpense } from "@/modules/payroll/service";
export async function PATCH(r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(c.session.user.id, c.organizationId, P.expensesPay);
    return successResponse(
      await payExpense({
        organizationId: c.organizationId,
        actorUserId: c.session.user.id,
        id: (await params).id,
        ...parseBody(expensePaymentSchema, await r.json()),
        requestId: id,
      }),
      id,
    );
  } catch (e) {
    return errorResponse(e, id);
  }
}
