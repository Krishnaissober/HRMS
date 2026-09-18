import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { getMasterAdminContext } from "@/lib/admin-access";
import { requestId, successResponse } from "@/lib/request";
import { listMasterHiringReviews } from "@/modules/hiring/approval";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getMasterAdminContext(request);
    return successResponse(await listMasterHiringReviews(context.organizationId), id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
