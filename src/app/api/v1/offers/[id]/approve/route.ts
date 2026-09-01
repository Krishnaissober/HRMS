import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { HIRING_PERMISSIONS } from "@/modules/hiring/constants";
import { offerApprovalSchema } from "@/modules/hiring/schemas";
import { approveOffer } from "@/modules/hiring/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, HIRING_PERMISSIONS.offersApprove); const parsed = parseBody(offerApprovalSchema, await request.json()); return successResponse(await approveOffer({ organizationId: context.organizationId, actorUserId: context.session.user.id, id: (await params).id, ...parsed, requestId: id }), id); } catch (error) { return errorResponse(error, id); }
}
