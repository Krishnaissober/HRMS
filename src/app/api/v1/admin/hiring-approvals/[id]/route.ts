import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { getMasterAdminContext } from "@/lib/admin-access";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { z } from "zod";
import { decideMasterHiringReview, getMasterHiringReview } from "@/modules/hiring/approval";

const schema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  remarks: z.string().trim().max(5000).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getMasterAdminContext(request);
    const review = await getMasterHiringReview(context.organizationId, (await params).id);
    if (!review) return errorResponse({ code: "NOT_FOUND", message: "Candidate not found", status: 404 }, id);
    return successResponse(review, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getMasterAdminContext(request);
    const input = parseBody(schema, await request.json());
    return successResponse(
      await decideMasterHiringReview({
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
