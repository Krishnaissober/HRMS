import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody, parseQuery } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { onboardingCreateSchema, onboardingListSchema } from "@/modules/employees/schemas";
import { listOnboarding } from "@/modules/employees/repository";
import { createOnboarding } from "@/modules/employees/service";

export async function GET(request: NextRequest) { const id = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_PERMISSIONS.onboardingRead); return successResponse(await listOnboarding(context.organizationId, parseQuery(onboardingListSchema, request.nextUrl.searchParams)), id); } catch (error) { return errorResponse(error, id); } }
export async function POST(request: NextRequest) { const id = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_PERMISSIONS.onboardingManage); const parsed = parseBody(onboardingCreateSchema, await request.json()); return successResponse(await createOnboarding({ organizationId: context.organizationId, actorUserId: context.session.user.id, ...parsed, requestId: id }), id, { status: 201 }); } catch (error) { return errorResponse(error, id); } }
