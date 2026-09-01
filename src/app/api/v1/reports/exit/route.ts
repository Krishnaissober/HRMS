import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
export async function GET(request: NextRequest){const rid=requestId(request);try{const c=await getAuthenticatedContext(request);await requirePermission(c.session.user.id,c.organizationId,"audit.read");const [cases,completed,tasks,returned]=await db.$transaction([db.exitCase.count({where:{organizationId:c.organizationId}}),db.exitCase.count({where:{organizationId:c.organizationId,status:"COMPLETED"}}),db.exitClearanceTask.count({where:{organizationId:c.organizationId}}),db.onboardingAsset.count({where:{organizationId:c.organizationId,status:"RETURNED"}})]);return successResponse({organizationId:c.organizationId,exitCases:cases,completedExitCases:completed,clearanceTasks:tasks,returnedAssets:returned},rid);}catch(e){return errorResponse(e,rid);}}
