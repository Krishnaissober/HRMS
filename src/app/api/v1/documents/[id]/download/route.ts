import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { hasPermission, requirePermission } from "@/lib/rbac";
import { PHASE8_PERMISSIONS } from "@/modules/documents-notifications/constants";
import { downloadDocument } from "@/modules/documents-notifications/service";
export async function GET(r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const q = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(c.session.user.id, c.organizationId, PHASE8_PERMISSIONS.documentsRead);
    return successResponse(
      await downloadDocument({
        organizationId: c.organizationId,
        actorUserId: c.session.user.id,
        id: (await params).id,
        version: Number(r.nextUrl.searchParams.get("version")) || undefined,
        requestId: q,
        actorEmail: c.session.user.email,
        companyScope: await hasPermission(
          c.session.user.id,
          c.organizationId,
          PHASE8_PERMISSIONS.documentsManage,
        ),
      }),
      q,
    );
  } catch (e) {
    return errorResponse(e, q);
  }
}
