import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { requirePermissions } from "@/lib/rbac";
import { getAuthenticatedContext } from "@/lib/tenant";
import { parseBody, parseQuery } from "@/lib/validate";
import { ANALYTICS_PERMISSIONS } from "@/modules/analytics/constants";
import { analyticsDomainSchema, analyticsQuerySchema } from "@/modules/analytics/schemas";
import { analyticsForDomain } from "@/modules/analytics/service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ domain: string }> }) {
  const id = requestId(request);
  try {
    const domain = parseBody(analyticsDomainSchema, (await params).domain);
    const context = await getAuthenticatedContext(request);
    await requirePermissions(context.session.user.id, context.organizationId, ANALYTICS_PERMISSIONS[domain]);
    const query = parseQuery(analyticsQuerySchema, request.nextUrl.searchParams);
    return successResponse(await analyticsForDomain(domain, context.organizationId, query, { userId: context.session.user.id, email: context.session.user.email }), id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
