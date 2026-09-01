import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { taskCompleteSchema } from "@/modules/employees/schemas";
import { completeTask } from "@/modules/employees/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) { const requestIdValue = requestId(request); try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, EMPLOYEE_PERMISSIONS.tasksComplete); const parsed = parseBody(taskCompleteSchema, await request.json()); const values = await params; return successResponse(await completeTask({ organizationId: context.organizationId, actorUserId: context.session.user.id, onboardingId: values.id, taskId: values.taskId, ...parsed, requestId: requestIdValue }), requestIdValue); } catch (error) { return errorResponse(error, requestIdValue); } }
