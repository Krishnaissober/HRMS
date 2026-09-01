import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { PAYROLL_PERMISSIONS as P } from "@/modules/payroll/constants";
import { generatePayslip } from "@/modules/payroll/service";
export async function POST(r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(c.session.user.id, c.organizationId, P.payslipsGenerate);
    return successResponse(
      await generatePayslip({
        organizationId: c.organizationId,
        actorUserId: c.session.user.id,
        resultId: (await params).id,
        requestId: id,
      }),
      id,
    );
  } catch (e) {
    return errorResponse(e, id);
  }
}
