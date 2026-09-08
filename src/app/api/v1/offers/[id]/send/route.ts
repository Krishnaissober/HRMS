import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { HIRING_PERMISSIONS } from "@/modules/hiring/constants";
import { sendOffer } from "@/modules/hiring/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      HIRING_PERMISSIONS.offersSend,
    );
    return successResponse(
      await sendOffer({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        id: (await params).id,
        requestId: id,
      }),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
