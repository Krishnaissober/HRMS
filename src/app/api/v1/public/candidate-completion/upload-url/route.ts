import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { createCompletionUploadUrl } from "@/modules/candidates/completion";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(40),
  kind: z.enum(["AADHAAR_IMAGE", "PAN_IMAGE"]),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png"]),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024),
});
export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    return successResponse(
      await createCompletionUploadUrl(parseBody(schema, await request.json())),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
