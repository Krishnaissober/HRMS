import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { PHASE8_PERMISSIONS } from "@/modules/documents-notifications/constants";
import { reminderGenerateSchema } from "@/modules/documents-notifications/schemas";
import { generateWorkflowReminders } from "@/modules/documents-notifications/service";
export async function POST(r: NextRequest) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(c.session.user.id, c.organizationId, PHASE8_PERMISSIONS.tasksManage);
    return successResponse(
      await generateWorkflowReminders({
        organizationId: c.organizationId,
        actorUserId: c.session.user.id,
        ...parseBody(reminderGenerateSchema, await r.json()),
        requestId: id,
      }),
      id,
    );
  } catch (e) {
    return errorResponse(e, id);
  }
}
