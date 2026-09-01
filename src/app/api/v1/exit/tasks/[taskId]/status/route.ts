import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { hasPermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { exitTaskStatusSchema } from "@/modules/employees/schemas";
import { updateExitTask } from "@/modules/employees/service";
export async function PATCH(request:NextRequest,{params}:{params:Promise<{taskId:string}>}){const rid=requestId(request);try{const c=await getAuthenticatedContext(request);const allowOverride=await hasPermission(c.session.user.id,c.organizationId,EMPLOYEE_PERMISSIONS.exitManage);const b=parseBody(exitTaskStatusSchema,await request.json());return successResponse(await updateExitTask({organizationId:c.organizationId,actorUserId:c.session.user.id,allowOverride,taskId:(await params).taskId,...b,requestId:rid}),rid);}catch(e){return errorResponse(e,rid);}}
