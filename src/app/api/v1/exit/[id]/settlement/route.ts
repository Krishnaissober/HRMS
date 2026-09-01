import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { exitSettlementSchema } from "@/modules/employees/schemas";
import { updateExitSettlement } from "@/modules/employees/service";
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){const rid=requestId(request);try{const c=await getAuthenticatedContext(request);await requirePermission(c.session.user.id,c.organizationId,EMPLOYEE_PERMISSIONS.exitSettle);const b=parseBody(exitSettlementSchema,await request.json());return successResponse(await updateExitSettlement({organizationId:c.organizationId,actorUserId:c.session.user.id,exitCaseId:(await params).id,...b,requestId:rid}),rid);}catch(e){return errorResponse(e,rid);}}
