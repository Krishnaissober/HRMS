import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseQuery } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { PHASE8_PERMISSIONS } from "@/modules/documents-notifications/constants";
import { notificationListSchema } from "@/modules/documents-notifications/schemas";
import { listNotifications } from "@/modules/documents-notifications/service";
export async function GET(r: NextRequest) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(
      c.session.user.id,
      c.organizationId,
      PHASE8_PERMISSIONS.notificationsRead,
    );
    return successResponse(
      await listNotifications(
        c.organizationId,
        c.session.user.id,
        parseQuery(notificationListSchema, r.nextUrl.searchParams),
      ),
      id,
    );
  } catch (e) {
    return errorResponse(e, id);
  }
}
