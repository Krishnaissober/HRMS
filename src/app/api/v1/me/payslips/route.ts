import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { myPayslips } from "@/modules/payroll/service";
export async function GET(r: NextRequest) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    return successResponse(await myPayslips(c.organizationId, c.session.user.email), id);
  } catch (e) {
    return errorResponse(e, id);
  }
}
