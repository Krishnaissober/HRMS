import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { submitCandidateCompletion } from "@/modules/candidates/completion";
import { z } from "zod";

const schema = z.object({
  token: z.string().trim().min(40),
  fields: z.record(z.string(), z.string().max(5000)).default({}),
  documents: z
    .array(
      z.object({
        kind: z.enum(["AADHAAR_IMAGE", "PAN_IMAGE"]),
        objectKey: z.string().min(1).max(500),
        fileName: z.string().min(1).max(255),
        contentType: z.enum(["image/jpeg", "image/png"]),
        byteSize: z
          .number()
          .int()
          .positive()
          .max(5 * 1024 * 1024),
      }),
    )
    .max(2)
    .default([]),
  consent: z.boolean().default(false),
  finalize: z.boolean().default(true),
});
export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const token = request.nextUrl.searchParams.get("token") || "";
    const { getCandidateCompletionLink, candidateCompletionFields } =
      await import("@/modules/candidates/completion");
    const link = await getCandidateCompletionLink(token);
    const values = Object.fromEntries(
      candidateCompletionFields
        .filter((field) => (link.requestedFields as string[]).includes(field))
        .map((field) => [field, link.candidate[field] || ""]),
    );
    const completedDocuments = link.candidate.documents
      .filter(
        (document) =>
          (document.kind === "AADHAAR_IMAGE" || document.kind === "PAN_IMAGE") &&
          (link.requestedFields as string[]).includes(
            document.kind === "AADHAAR_IMAGE" ? "aadhaarImage" : "panImage",
          ),
      )
      .map((document) => document.kind);
    return successResponse(
      {
        candidate: {
          firstName: link.candidate.firstName,
          lastName: link.candidate.lastName,
          roleOfInterest: link.candidate.roleOfInterest,
        },
        requestedFields: link.requestedFields,
        values,
        completedDocuments,
        expiresAt: link.expiresAt,
      },
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const parsed = parseBody(schema, await request.json());
    return successResponse(await submitCandidateCompletion(parsed), id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
