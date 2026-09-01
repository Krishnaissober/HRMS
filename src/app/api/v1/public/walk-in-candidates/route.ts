import { NextRequest } from "next/server";
import { AppError, errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { InMemoryRateLimiter } from "@/lib/rate-limit";
import { publicWalkInCandidateSchema } from "@/modules/candidates/schemas";
import { submitPublicCandidate } from "@/modules/candidates/service";

const limiter = new InMemoryRateLimiter(10, 60_000);

export async function POST(request: NextRequest) {
  const id = requestId(request);
  const rate = await limiter.check(request.headers.get("x-real-ip") || "shared-public");
  if (!rate.allowed) return errorResponse(new AppError("CONFLICT", "Too many submissions. Try again later.", 429, { retryAfterSeconds: rate.retryAfterSeconds }), id);
  try {
    const parsed = parseBody(publicWalkInCandidateSchema, await request.json());
    const { organizationSlug, documents, ...fields } = parsed;
    const result = await submitPublicCandidate({ organizationSlug, source: "WALK_IN", fields, documents, requestId: id });
    return successResponse({ referenceNo: result.submission.referenceNo, candidateId: result.candidate.id, duplicateMatched: result.duplicateMatched }, id, { status: 201 });
  } catch (error) {
    const safeError = error instanceof Error && error.message.toLowerCase().includes("storage")
      ? new AppError("INTERNAL_ERROR", "Document storage is unavailable. Please upload the resume again.", 503)
      : error;
    return errorResponse(safeError, id);
  }
}
