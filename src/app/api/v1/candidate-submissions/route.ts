import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      CANDIDATE_PERMISSIONS.read,
    );
    const items = await db.candidateSubmission.findMany({
      where: { organizationId: context.organizationId },
      include: {
        candidate: {
          select: {
            id: true,
            referenceNo: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });
    return successResponse({ items, total: items.length }, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
