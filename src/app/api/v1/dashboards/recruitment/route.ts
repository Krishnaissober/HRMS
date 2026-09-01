import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { requirePermissions } from "@/lib/rbac";
import { getAuthenticatedContext } from "@/lib/tenant";
import { parseQuery } from "@/lib/validate";
import {
  DASHBOARD_PERMISSIONS,
  RECRUITMENT_DRILLDOWN_PERMISSIONS,
} from "@/modules/dashboards/constants";
import { dashboardRangeSchema } from "@/modules/dashboards/schemas";
import { recruitmentDashboard } from "@/modules/dashboards/service";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermissions(context.session.user.id, context.organizationId, [
      DASHBOARD_PERMISSIONS.recruitmentRead,
      ...RECRUITMENT_DRILLDOWN_PERMISSIONS,
    ]);
    const range = parseQuery(dashboardRangeSchema, request.nextUrl.searchParams);
    return successResponse(await recruitmentDashboard(context.organizationId, range), id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
