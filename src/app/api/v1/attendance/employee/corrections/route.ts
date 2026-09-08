import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_ATTENDANCE_PERMISSIONS } from "@/modules/employee-attendance/constants";
import { correctionRequestSchema } from "@/modules/employee-attendance/schemas";
import { requestCorrection } from "@/modules/employee-attendance/service";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      EMPLOYEE_ATTENDANCE_PERMISSIONS.correctionsRequest,
    );
    const parsed = parseBody(correctionRequestSchema, await request.json());
    return successResponse(
      await requestCorrection({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        userEmail: context.session.user.email,
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
