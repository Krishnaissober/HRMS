import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { PHASE8_PERMISSIONS } from "@/modules/documents-notifications/constants";
import { taskSchema } from "@/modules/documents-notifications/schemas";
import { createTask, listTasks } from "@/modules/documents-notifications/service";
export async function GET(r: NextRequest) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(c.session.user.id, c.organizationId, PHASE8_PERMISSIONS.tasksRead);
    return successResponse(await listTasks(c.organizationId, c.session.user.id), id);
  } catch (e) {
    return errorResponse(e, id);
  }
}
export async function POST(r: NextRequest) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(c.session.user.id, c.organizationId, PHASE8_PERMISSIONS.tasksManage);
    return successResponse(
      await createTask({
        organizationId: c.organizationId,
        actorUserId: c.session.user.id,
        ...parseBody(taskSchema, await r.json()),
        requestId: id,
      }),
      id,
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e, id);
  }
}
