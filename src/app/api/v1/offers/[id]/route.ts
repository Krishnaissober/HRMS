import { NextRequest } from "next/server";
import { errorResponse, notFoundError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { HIRING_PERMISSIONS } from "@/modules/hiring/constants";
import { getOffer } from "@/modules/hiring/repository";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, HIRING_PERMISSIONS.offersRead); const offer = await getOffer(context.organizationId, (await params).id); if (!offer) throw notFoundError(); return successResponse(offer, id); } catch (error) { return errorResponse(error, id); }
}
