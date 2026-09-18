import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import {
  candidateCompletionFields,
  candidateCompletionDocumentFields,
  createCandidateCompletionLink,
  getCandidateCompletionState,
  revokeCandidateCompletionLink,
} from "@/modules/candidates/completion";
import { z } from "zod";

const completionFieldNames = [
  ...candidateCompletionFields,
  "aadhaarNumber",
  "panNumber",
  ...candidateCompletionDocumentFields,
] as const;

const requestSchema = z.object({
  requestedFields: z.array(z.enum(completionFieldNames)).min(1).max(40).optional(),
  regenerate: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      CANDIDATE_PERMISSIONS.read,
    );
    return successResponse(
      await getCandidateCompletionState(context.organizationId, (await params).id),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      CANDIDATE_PERMISSIONS.update,
    );
    const body = parseBody(requestSchema, await request.json().catch(() => ({})));
    const result = await createCandidateCompletionLink({
      organizationId: context.organizationId,
      candidateId: (await params).id,
      actorUserId: context.session.user.id,
      requestId: id,
      requestedFields: body.requestedFields,
      regenerate: body.regenerate,
    });
    return successResponse(
      { ...result, url: `${request.nextUrl.origin}/candidate-completion/${result.token}` },
      id,
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      CANDIDATE_PERMISSIONS.update,
    );
    const result = await revokeCandidateCompletionLink({
      organizationId: context.organizationId,
      candidateId: (await params).id,
      actorUserId: context.session.user.id,
      requestId: id,
    });
    return successResponse(result, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
