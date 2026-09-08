import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { HIRING_PERMISSIONS } from "@/modules/hiring/constants";
import { decisionCreateSchema } from "@/modules/hiring/schemas";
import { createHiringDecision } from "@/modules/hiring/service";
import { listHiringDecisions } from "@/modules/hiring/repository";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      HIRING_PERMISSIONS.decisionsRead,
    );
    return successResponse(
      await listHiringDecisions(
        context.organizationId,
        request.nextUrl.searchParams.get("applicationId") || undefined,
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
      HIRING_PERMISSIONS.decisionsWrite,
    );
    const parsed = parseBody(decisionCreateSchema, await request.json());
    return successResponse(
      await createHiringDecision({
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
