import { NextRequest } from "next/server";
import { AppError, errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { createUploadUrl } from "@/lib/storage";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { uploadUrlRequestSchema, validateDocumentMetadata } from "@/modules/candidates/schemas";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(context.session.user.id, context.organizationId, CANDIDATE_PERMISSIONS.documentsWrite);
    const parsed = parseBody(uploadUrlRequestSchema, await request.json());
    validateDocumentMetadata(parsed);
    const objectKey = `candidate-intake/${context.organizationId}/${crypto.randomUUID()}-${safeName(parsed.fileName)}`;
    const uploadUrl = await createUploadUrl(objectKey, parsed.contentType);
    return successResponse({ objectKey, uploadUrl, expiresIn: 900 }, id);
  } catch (error) {
    return errorResponse(error instanceof Error && error.message.includes("storage") ? new AppError("INTERNAL_ERROR", "Document storage is not configured", 503) : error, id);
  }
}
