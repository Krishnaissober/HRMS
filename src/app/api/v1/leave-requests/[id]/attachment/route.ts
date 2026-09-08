import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { LEAVE_PERMISSIONS } from "@/modules/leave/constants";
import { leaveAttachmentDownload } from "@/modules/leave/service";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      LEAVE_PERMISSIONS.read,
    );
    return successResponse(
      await leaveAttachmentDownload({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        actorEmail: context.session.user.email,
        id: (await params).id,
        requestId: id,
      }),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
