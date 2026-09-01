import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { payslipPdf } from "@/modules/payroll/service";
export async function GET(r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    const p = await payslipPdf({
      organizationId: c.organizationId,
      actorUserId: c.session.user.id,
      employeeEmail: c.session.user.email,
      resultId: (await params).id,
      requestId: id,
    });
    return new Response(Buffer.from(p.bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${p.fileName}"`,
      },
    });
  } catch (e) {
    return errorResponse(e, id);
  }
}
