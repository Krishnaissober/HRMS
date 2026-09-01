import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { INTERVIEW_PERMISSIONS } from "@/modules/interviews/constants";
import { interviewCheckOutSchema } from "@/modules/interviews/schemas";
import { checkOutInterview } from "@/modules/interviews/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, INTERVIEW_PERMISSIONS.attendance); parseBody(interviewCheckOutSchema, await request.json()); const result = await checkOutInterview({ organizationId: context.organizationId, actorUserId: context.session.user.id, id: (await params).id, requestId: id, direction: "CHECK_OUT" }); return successResponse(result, id); } catch (error) { return errorResponse(error, id); }
}
