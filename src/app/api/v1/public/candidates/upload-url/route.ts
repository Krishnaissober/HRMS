import { NextRequest } from "next/server";
import { AppError, errorResponse, notFoundError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { createUploadUrl } from "@/lib/storage";
import { publicUploadUrlSchema } from "@/modules/candidates/schemas";
import { validateDocumentMetadata } from "@/modules/candidates/schemas";
import { findOrganizationBySlug } from "@/modules/candidates/repository";
import { InMemoryRateLimiter } from "@/lib/rate-limit";

const limiter = new InMemoryRateLimiter(20, 60_000);

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  const rate = await limiter.check(request.headers.get("x-real-ip") || "shared-public");
  if (!rate.allowed)
    return errorResponse(
      new AppError("CONFLICT", "Too many upload requests. Try again later.", 429, {
        retryAfterSeconds: rate.retryAfterSeconds,
      }),
      id,
    );
  try {
    const parsed = parseBody(publicUploadUrlSchema, await request.json());
    validateDocumentMetadata(parsed);
    const organization = await findOrganizationBySlug(parsed.organizationSlug);
    if (!organization) throw notFoundError();
    const objectKey = `intake/${organization.id}/${crypto.randomUUID()}-${safeName(parsed.fileName)}`;
    const uploadUrl = await createUploadUrl(objectKey, parsed.contentType);
    return successResponse({ objectKey, uploadUrl, expiresIn: 900 }, id);
  } catch (error) {
    return errorResponse(
      error instanceof Error && error.message.includes("storage")
        ? new AppError("INTERNAL_ERROR", "Document storage is not configured", 503)
        : error,
      id,
    );
  }
}
