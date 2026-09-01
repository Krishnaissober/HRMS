import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { receiptDownload } from "@/modules/payroll/service";
export async function GET(r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    return Response.redirect(
      await receiptDownload({ organizationId: c.organizationId, actorUserId: c.session.user.id, id: (await params).id, employeeEmail: c.session.user.email, requestId: id }),
    );
  } catch (e) {
    return errorResponse(e, id);
  }
}
