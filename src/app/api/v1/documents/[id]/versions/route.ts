import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { PHASE8_PERMISSIONS } from "@/modules/documents-notifications/constants";
import { documentVersionSchema } from "@/modules/documents-notifications/schemas";
import { addDocumentVersion } from "@/modules/documents-notifications/service";
export async function POST(r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const q = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(
      c.session.user.id,
      c.organizationId,
      PHASE8_PERMISSIONS.documentsManage,
    );
    return successResponse(
      await addDocumentVersion({
        organizationId: c.organizationId,
        actorUserId: c.session.user.id,
        id: (await params).id,
        ...parseBody(documentVersionSchema, await r.json()),
        requestId: q,
      }),
      q,
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e, q);
  }
}
