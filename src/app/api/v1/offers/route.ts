import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody, parseQuery } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { HIRING_PERMISSIONS } from "@/modules/hiring/constants";
import { offerCreateSchema, offerListSchema } from "@/modules/hiring/schemas";
import { createOffer } from "@/modules/hiring/service";
import { listOffers } from "@/modules/hiring/repository";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, HIRING_PERMISSIONS.offersRead); return successResponse(await listOffers(context.organizationId, parseQuery(offerListSchema, request.nextUrl.searchParams)), id); } catch (error) { return errorResponse(error, id); }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, HIRING_PERMISSIONS.offersCreate); const parsed = parseBody(offerCreateSchema, await request.json()); return successResponse(await createOffer({ organizationId: context.organizationId, actorUserId: context.session.user.id, ...parsed, requestId: id }), id, { status: 201 }); } catch (error) { return errorResponse(error, id); }
}
