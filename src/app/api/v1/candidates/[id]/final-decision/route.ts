import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { z } from "zod";
import { finalizeHiringDecision } from "@/modules/hiring/approval";

const schema = z.object({
  decision: z.enum(["HIRE", "REJECT"]),
  remarks: z.string().trim().max(5000).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      CANDIDATE_PERMISSIONS.update,
    );
    const input = parseBody(schema, await request.json());
    return successResponse(
      await finalizeHiringDecision({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        candidateId: (await params).id,
        ...input,
        requestId: id,
      }),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
