import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermissions } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { completeExitCase } from "@/modules/employees/service";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){const rid=requestId(request);try{const c=await getAuthenticatedContext(request);await requirePermissions(c.session.user.id,c.organizationId,[EMPLOYEE_PERMISSIONS.exitManage,EMPLOYEE_PERMISSIONS.accessManage]);return successResponse(await completeExitCase({organizationId:c.organizationId,actorUserId:c.session.user.id,exitCaseId:(await params).id,requestId:rid}),rid);}catch(e){return errorResponse(e,rid);}}
