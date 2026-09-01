import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { PHASE8_PERMISSIONS } from "@/modules/documents-notifications/constants";
import { notificationReadSchema } from "@/modules/documents-notifications/schemas";
import { markNotification } from "@/modules/documents-notifications/service";
export async function PATCH(r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const q = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(
      c.session.user.id,
      c.organizationId,
      PHASE8_PERMISSIONS.notificationsRead,
    );
    return successResponse(
      await markNotification({
        organizationId: c.organizationId,
        userId: c.session.user.id,
        id: (await params).id,
        ...parseBody(notificationReadSchema, await r.json()),
      }),
      q,
    );
  } catch (e) {
    return errorResponse(e, q);
  }
}
