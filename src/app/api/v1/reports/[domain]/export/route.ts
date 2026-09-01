import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { recordAuditEvent } from "@/lib/audit";
import { requestId } from "@/lib/request";
import { requirePermissions } from "@/lib/rbac";
import { getAuthenticatedContext } from "@/lib/tenant";
import { parseBody, parseQuery } from "@/lib/validate";
import { ANALYTICS_PERMISSIONS, REPORT_EXPORT_PERMISSION } from "@/modules/analytics/constants";
import { analyticsDomainSchema, analyticsQuerySchema } from "@/modules/analytics/schemas";
import { analyticsCsv, analyticsForDomain } from "@/modules/analytics/service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ domain: string }> }) {
  const id = requestId(request);
  try {
    const domain = parseBody(analyticsDomainSchema, (await params).domain);
    const context = await getAuthenticatedContext(request);
    await requirePermissions(context.session.user.id, context.organizationId, [...ANALYTICS_PERMISSIONS[domain], REPORT_EXPORT_PERMISSION]);
    const query = parseQuery(analyticsQuerySchema, request.nextUrl.searchParams);
    const data = await analyticsForDomain(domain, context.organizationId, query, { userId: context.session.user.id, email: context.session.user.email });
    await recordAuditEvent({ organizationId: context.organizationId, actorUserId: context.session.user.id, action: "REPORT_EXPORTED", entityType: "AnalyticsReport", entityId: domain, requestId: id, metadata: { domain, filters: query, format: "CSV" } });
    return new Response(analyticsCsv(data), { status: 200, headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${domain}-report.csv"`, "x-request-id": id } });
  } catch (error) {
    return errorResponse(error, id);
  }
}
