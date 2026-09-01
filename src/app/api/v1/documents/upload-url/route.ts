import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { PHASE8_PERMISSIONS } from "@/modules/documents-notifications/constants";
import { uploadUrlSchema } from "@/modules/documents-notifications/schemas";
import { managedDocumentUpload } from "@/modules/documents-notifications/service";
export async function POST(r: NextRequest) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(
      c.session.user.id,
      c.organizationId,
      PHASE8_PERMISSIONS.documentsManage,
    );
    return successResponse(
      await managedDocumentUpload({
        organizationId: c.organizationId,
        ...parseBody(uploadUrlSchema, await r.json()),
      }),
      id,
    );
  } catch (e) {
    return errorResponse(e, id);
  }
}
