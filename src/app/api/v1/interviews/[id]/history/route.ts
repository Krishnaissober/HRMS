import { NextRequest } from "next/server";
import { errorResponse, notFoundError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { INTERVIEW_PERMISSIONS } from "@/modules/interviews/constants";
import { db } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      INTERVIEW_PERMISSIONS.read,
    );
    const interviewId = (await params).id;
    const interview = await db.interview.findFirst({
      where: { id: interviewId, organizationId: context.organizationId },
    });
    if (!interview) throw notFoundError();
    const history = await db.interviewActivity.findMany({
      where: { interviewId, organizationId: context.organizationId },
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { id: true, name: true, email: true } } },
    });
    return successResponse(history, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
