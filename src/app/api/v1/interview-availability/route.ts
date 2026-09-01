import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { INTERVIEW_PERMISSIONS } from "@/modules/interviews/constants";
import { interviewAvailabilitySchema } from "@/modules/interviews/schemas";
import { createAvailability } from "@/modules/interviews/service";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, INTERVIEW_PERMISSIONS.read); return successResponse(await db.interviewAvailability.findMany({ where: { organizationId: context.organizationId }, orderBy: { startsAt: "asc" } }), id); } catch (error) { return errorResponse(error, id); }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, INTERVIEW_PERMISSIONS.schedule); const parsed = parseBody(interviewAvailabilitySchema, await request.json()); const availability = await createAvailability({ organizationId: context.organizationId, actorUserId: context.session.user.id, ...parsed, requestId: id }); return successResponse(availability, id, { status: 201 }); } catch (error) { return errorResponse(error, id); }
}
