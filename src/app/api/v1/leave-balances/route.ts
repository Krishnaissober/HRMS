import { NextRequest } from "next/server";
import { errorResponse, validationError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { LEAVE_PERMISSIONS } from "@/modules/leave/constants";
import { leaveBalanceSchema } from "@/modules/leave/schemas";
import { listLeaveBalances } from "@/modules/leave/repository";
import { setLeaveBalance } from "@/modules/leave/service";
export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      LEAVE_PERMISSIONS.read,
    );
    const employeeId = request.nextUrl.searchParams.get("employeeId");
    if (!employeeId) throw validationError({ employeeId: ["Employee ID is required"] });
    const year = request.nextUrl.searchParams.get("year");
    return successResponse(
      await listLeaveBalances(context.organizationId, employeeId, year ? Number(year) : undefined),
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
      LEAVE_PERMISSIONS.balancesManage,
    );
    const body = parseBody(leaveBalanceSchema, await request.json());
    return successResponse(
      await setLeaveBalance({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        ...body,
        requestId: id,
      }),
      id,
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
