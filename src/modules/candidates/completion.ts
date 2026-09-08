import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { writeAuditEvent } from "@/lib/audit";
import { createUploadUrl } from "@/lib/storage";
import { AppError, notFoundError, validationError } from "@/lib/errors";
import { encryptPii } from "@/lib/pii";

const textFields = [
  "dateOfBirth",
  "gender",
  "addressLine1",
  "city",
  "state",
  "postalCode",
  "education",
  "employmentHistory",
  "currentCompany",
  "howFound",
  "reasonForJobChange",
  "skills",
  "ctc",
  "hikePercentage",
  "noticePeriod",
] as const;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
function tokenValue() {
  return randomBytes(32).toString("base64url");
}

export async function createCandidateCompletionLink(input: {
  organizationId: string;
  candidateId: string;
  actorUserId: string;
  requestId?: string;
}) {
  const candidate = await db.candidate.findFirst({
    where: { id: input.candidateId, organizationId: input.organizationId },
    include: { documents: { select: { kind: true } } },
  });
  if (!candidate) throw notFoundError();
  const requestedFields = textFields.filter((field) => !candidate[field]?.trim());
  if (!candidate.aadhaarNumber) requestedFields.push("aadhaarNumber" as never);
  if (!candidate.panNumber) requestedFields.push("panNumber" as never);
  if (!candidate.documents.some((document) => document.kind === "AADHAAR_IMAGE"))
    requestedFields.push("aadhaarImage" as never);
  if (!candidate.documents.some((document) => document.kind === "PAN_IMAGE"))
    requestedFields.push("panImage" as never);
  if (!requestedFields.length)
    throw new AppError("CONFLICT", "This candidate has no missing details", 409);
  const rawToken = tokenValue();
  const link = await db.$transaction(async (tx) => {
    const created = await tx.candidateCompletionLink.create({
      data: {
        organizationId: input.organizationId,
        candidateId: candidate.id,
        tokenHash: hashToken(rawToken),
        requestedFields,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdByUserId: input.actorUserId,
      },
    });
    await tx.candidateActivity.create({
      data: {
        organizationId: input.organizationId,
        candidateId: candidate.id,
        actorUserId: input.actorUserId,
        action: "CANDIDATE_COMPLETION_LINK_CREATED",
        metadata: { linkId: created.id, requestedFields },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "CANDIDATE_COMPLETION_LINK_CREATED",
      entityType: "Candidate",
      entityId: candidate.id,
      requestId: input.requestId,
      metadata: { linkId: created.id, requestedFields },
    });
    return created;
  });
  return { token: rawToken, linkId: link.id, requestedFields, expiresAt: link.expiresAt };
}

export async function getCandidateCompletionLink(token: string) {
  const link = await db.candidateCompletionLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { candidate: true },
  });
  if (!link || link.usedAt || link.expiresAt <= new Date()) throw notFoundError();
  return link;
}

export async function createCompletionUploadUrl(input: {
  token: string;
  kind: "AADHAAR_IMAGE" | "PAN_IMAGE";
  fileName: string;
  contentType: "image/jpeg" | "image/png";
  byteSize: number;
}) {
  const link = await getCandidateCompletionLink(input.token);
  const field = input.kind === "AADHAAR_IMAGE" ? "aadhaarImage" : "panImage";
  if (!(link.requestedFields as string[]).includes(field))
    throw validationError({ kind: ["This document was not requested"] });
  const objectKey = `candidates/${link.organizationId}/${link.candidateId}/identity/${randomBytes(16).toString("hex")}-${input.fileName}`;
  return { objectKey, uploadUrl: await createUploadUrl(objectKey, input.contentType), ...input };
}

export async function submitCandidateCompletion(input: {
  token: string;
  fields: Record<string, string>;
  documents: Array<{
    kind: "AADHAAR_IMAGE" | "PAN_IMAGE";
    objectKey: string;
    fileName: string;
    contentType: string;
    byteSize: number;
  }>;
  consent: boolean;
}) {
  const link = await getCandidateCompletionLink(input.token);
  const allowed = new Set(link.requestedFields as string[]);
  const patch: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.fields))
    if (allowed.has(key) && value.trim()) patch[key] = value.trim();
  if (patch.aadhaarNumber) patch.aadhaarNumber = patch.aadhaarNumber.replace(/[\s-]/g, "");
  if (patch.panNumber) patch.panNumber = patch.panNumber.toUpperCase().replace(/\s/g, "");
  if (!input.consent)
    throw validationError({ consent: ["Consent is required to submit identity information"] });
  if (
    allowed.has("aadhaarNumber") &&
    patch.aadhaarNumber &&
    !/^[0-9]{12}$/.test(patch.aadhaarNumber)
  )
    throw validationError({ aadhaarNumber: ["Aadhaar number must contain 12 digits"] });
  if (
    allowed.has("panNumber") &&
    patch.panNumber &&
    !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(patch.panNumber)
  )
    throw validationError({ panNumber: ["PAN number format is invalid"] });
  if (patch.aadhaarNumber) patch.aadhaarNumber = encryptPii(patch.aadhaarNumber);
  if (patch.panNumber) patch.panNumber = encryptPii(patch.panNumber);
  for (const document of input.documents) {
    if (!allowed.has(document.kind === "AADHAAR_IMAGE" ? "aadhaarImage" : "panImage"))
      throw validationError({ documents: ["Unexpected identity document"] });
    if (
      !document.objectKey.startsWith(
        `candidates/${link.organizationId}/${link.candidateId}/identity/`,
      )
    )
      throw validationError({ documents: ["Document is not scoped to this candidate"] });
  }
  if (!Object.keys(patch).length && !input.documents.length)
    throw validationError({ fields: ["Provide at least one missing detail or identity document"] });
  return db.$transaction(async (tx) => {
    const candidate = await tx.candidate.update({ where: { id: link.candidateId }, data: patch });
    if (input.documents.length)
      await tx.candidateDocument.createMany({
        data: input.documents.map((document) => ({
          organizationId: link.organizationId,
          candidateId: link.candidateId,
          kind: document.kind,
          objectKey: document.objectKey,
          fileName: document.fileName,
          contentType: document.contentType,
          byteSize: document.byteSize,
        })),
      });
    await tx.candidateCompletionLink.update({
      where: { id: link.id },
      data: { usedAt: new Date() },
    });
    await tx.candidateActivity.create({
      data: {
        organizationId: link.organizationId,
        candidateId: link.candidateId,
        action: "CANDIDATE_DETAILS_COMPLETED",
        metadata: {
          fields: Object.keys(patch),
          documentKinds: input.documents.map((document) => document.kind),
        },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: link.organizationId,
      action: "CANDIDATE_DETAILS_COMPLETED",
      entityType: "Candidate",
      entityId: link.candidateId,
      metadata: {
        fields: Object.keys(patch),
        documentKinds: input.documents.map((document) => document.kind),
      },
    });
    return candidate;
  });
}
