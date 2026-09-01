import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { errorResponse, validationError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { uploadObject } from "@/lib/storage";
import { getCandidateCompletionLink } from "@/modules/candidates/completion";

const kinds = new Set(["AADHAAR_IMAGE", "PAN_IMAGE"]);
export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const form = await request.formData();
    const token = String(form.get("token") || "");
    const kind = String(form.get("kind") || "");
    const file = form.get("file");
    if (!token || !kinds.has(kind) || !(file instanceof File)) throw validationError({ file: ["A valid identity image is required"] });
    if (!(["image/jpeg", "image/png"] as string[]).includes(file.type)) throw validationError({ file: ["Only JPEG or PNG images are accepted"] });
    if (file.size < 1 || file.size > 5 * 1024 * 1024) throw validationError({ file: ["Identity images must be no larger than 5 MB"] });
    const link = await getCandidateCompletionLink(token);
    const field = kind === "AADHAAR_IMAGE" ? "aadhaarImage" : "panImage";
    if (!(link.requestedFields as string[]).includes(field)) throw validationError({ kind: ["This document was not requested"] });
    const objectKey = `candidates/${link.organizationId}/${link.candidateId}/identity/${randomBytes(16).toString("hex")}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await uploadObject(objectKey, new Uint8Array(await file.arrayBuffer()), file.type);
    return successResponse({ objectKey, fileName: file.name, contentType: file.type, byteSize: file.size, kind }, id);
  } catch (error) { return errorResponse(error, id); }
}
