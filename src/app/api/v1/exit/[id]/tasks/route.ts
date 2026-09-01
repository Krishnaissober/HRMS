import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { exitTaskSchema } from "@/modules/employees/schemas";
import { addExitTask } from "@/modules/employees/service";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){const rid=requestId(request);try{const c=await getAuthenticatedContext(request);await requirePermission(c.session.user.id,c.organizationId,EMPLOYEE_PERMISSIONS.exitManage);const b=parseBody(exitTaskSchema,await request.json());return successResponse(await addExitTask({organizationId:c.organizationId,actorUserId:c.session.user.id,exitCaseId:(await params).id,...b,requestId:rid}),rid,{status:201});}catch(e){return errorResponse(e,rid);}}
