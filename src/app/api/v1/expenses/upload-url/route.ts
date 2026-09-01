import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { PAYROLL_PERMISSIONS as P } from "@/modules/payroll/constants";
import { expenseUploadSchema } from "@/modules/payroll/schemas";
import { expenseUpload } from "@/modules/payroll/service";
export async function POST(r: NextRequest) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(c.session.user.id, c.organizationId, P.expensesSubmit);
    return successResponse(
      await expenseUpload({
        organizationId: c.organizationId,
        userId: c.session.user.id,
        ...parseBody(expenseUploadSchema, await r.json()),
      }),
      id,
    );
  } catch (e) {
    return errorResponse(e, id);
  }
}
