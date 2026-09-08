import { NextRequest } from "next/server";
import { requestId, successResponse } from "@/lib/request";
import { errorResponse } from "@/lib/errors";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { parseBody, parseQuery } from "@/lib/validate";
import { ATTENDANCE_PERMISSIONS } from "@/modules/attendance/constants";
import { attendanceListSchema, visitorCreateSchema } from "@/modules/attendance/schemas";
import { listVisits, registerVisitor } from "@/modules/attendance/service";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      ATTENDANCE_PERMISSIONS.read,
    );
    return successResponse(
      await listVisits(
        context.organizationId,
        parseQuery(attendanceListSchema, request.nextUrl.searchParams),
      ),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      ATTENDANCE_PERMISSIONS.manage,
    );
    const parsed = parseBody(visitorCreateSchema, await request.json());
    return successResponse(
      await registerVisitor({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        ...parsed,
        requestId: id,
      }),
      id,
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
