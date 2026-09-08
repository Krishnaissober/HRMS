import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { LEAVE_PERMISSIONS } from "@/modules/leave/constants";
import { attachmentUploadSchema } from "@/modules/leave/schemas";
import { createAttachmentUpload } from "@/modules/leave/service";
export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      LEAVE_PERMISSIONS.request,
    );
    const body = parseBody(attachmentUploadSchema, await request.json());
    return successResponse(
      await createAttachmentUpload({
        organizationId: context.organizationId,
        userEmail: context.session.user.email,
        ...body,
      }),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
