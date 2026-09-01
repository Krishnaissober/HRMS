import { NextRequest } from "next/server";
import { errorResponse, forbiddenError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { hasPermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { exitCreateSchema } from "@/modules/employees/schemas";
import { createExitCase } from "@/modules/employees/service";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const rid=requestId(request); try { const c=await getAuthenticatedContext(request); const allowOrganizationWide=await hasPermission(c.session.user.id,c.organizationId,EMPLOYEE_PERMISSIONS.exitManage); const allowTeam=await hasPermission(c.session.user.id,c.organizationId,EMPLOYEE_PERMISSIONS.exitTeamManage); if(!allowOrganizationWide&&!allowTeam) throw forbiddenError(); const body=parseBody(exitCreateSchema,await request.json()); return successResponse(await createExitCase({organizationId:c.organizationId,actorUserId:c.session.user.id,actorEmail:c.session.user.email,allowOrganizationWide,employeeId:(await params).id,...body,requestId:rid}),rid,{status:201}); } catch(e){return errorResponse(e,rid);} }
