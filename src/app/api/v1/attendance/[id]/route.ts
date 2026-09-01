import { NextRequest } from "next/server";
import { requestId, successResponse } from "@/lib/request";
import { errorResponse } from "@/lib/errors";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { ATTENDANCE_PERMISSIONS } from "@/modules/attendance/constants";
import { getVisit } from "@/modules/attendance/service";
import { notFoundError } from "@/lib/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try { const context = await getAuthenticatedContext(request); await requirePermission(context.session.user.id, context.organizationId, ATTENDANCE_PERMISSIONS.read); const visit = await getVisit(context.organizationId, (await params).id); if (!visit) throw notFoundError(); return successResponse(visit, id); } catch (error) { return errorResponse(error, id); }
}
