import { NextRequest } from "next/server";
import { errorResponse, notFoundError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { exitCreateSchema } from "@/modules/employees/schemas";
import { createExitCase, getSelfServiceEmployee } from "@/modules/employees/service";
export async function POST(request:NextRequest){const rid=requestId(request);try{const c=await getAuthenticatedContext(request);await requirePermission(c.session.user.id,c.organizationId,EMPLOYEE_PERMISSIONS.selfUpdate);const employee=await getSelfServiceEmployee({organizationId:c.organizationId,userEmail:c.session.user.email});if(!employee)throw notFoundError();const body=parseBody(exitCreateSchema,await request.json());return successResponse(await createExitCase({organizationId:c.organizationId,actorUserId:c.session.user.id,actorEmail:c.session.user.email,employeeId:employee.id,...body,requestId:rid}),rid,{status:201});}catch(e){return errorResponse(e,rid);}}
