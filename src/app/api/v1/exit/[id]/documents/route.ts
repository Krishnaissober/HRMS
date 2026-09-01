import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { exitDocumentAttachSchema } from "@/modules/employees/schemas";
import { attachExitDocument, listExitDocuments } from "@/modules/employees/service";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){const rid=requestId(request);try{const c=await getAuthenticatedContext(request);await requirePermission(c.session.user.id,c.organizationId,EMPLOYEE_PERMISSIONS.exitRead);return successResponse(await listExitDocuments(c.organizationId,(await params).id),rid);}catch(e){return errorResponse(e,rid);}}
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){const rid=requestId(request);try{const c=await getAuthenticatedContext(request);await requirePermission(c.session.user.id,c.organizationId,EMPLOYEE_PERMISSIONS.documentsWrite);const body=parseBody(exitDocumentAttachSchema,await request.json());return successResponse(await attachExitDocument({organizationId:c.organizationId,actorUserId:c.session.user.id,exitCaseId:(await params).id,...body,requestId:rid}),rid);}catch(e){return errorResponse(e,rid);}}
