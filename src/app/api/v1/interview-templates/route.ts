import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { INTERVIEW_PERMISSIONS } from "@/modules/interviews/constants";
import { interviewTemplateSchema } from "@/modules/interviews/schemas";
import { createTemplate } from "@/modules/interviews/service";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, INTERVIEW_PERMISSIONS.read); return successResponse(await db.interviewTemplate.findMany({ where: { organizationId: context.organizationId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } }), id); } catch (error) { return errorResponse(error, id); }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, INTERVIEW_PERMISSIONS.create); const parsed = parseBody(interviewTemplateSchema, await request.json()); const template = await createTemplate({ organizationId: context.organizationId, actorUserId: context.session.user.id, ...parsed, requestId: id }); return successResponse(template, id, { status: 201 }); } catch (error) { return errorResponse(error, id); }
}
