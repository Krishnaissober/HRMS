import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { writeAuditEvent } from "@/lib/audit";
import { createUploadUrl } from "@/lib/storage";
import { AppError, notFoundError, validationError } from "@/lib/errors";
import { encryptPii } from "@/lib/pii";

export const candidateCompletionFields = [
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
  "bankAccountName",
  "bankName",
  "bankBranchName",
  "bankAccountNumber",
  "bankIfscCode",
  "bankAccountType",
] as const;
export const candidateCompletionDocumentFields = ["aadhaarImage", "panImage"] as const;
const documentFieldToKind = {
  aadhaarImage: "AADHAAR_IMAGE",
  panImage: "PAN_IMAGE",
} as const;
const allCompletionFields = new Set<string>([
  ...candidateCompletionFields,
  "aadhaarNumber",
  "panNumber",
  ...candidateCompletionDocumentFields,
]);

type CandidateForCompletion = {
  documents: Array<{ kind: string }>;
  [key: string]: unknown;
};

function isFieldComplete(candidate: CandidateForCompletion, field: string) {
  if (field in documentFieldToKind) {
    return candidate.documents.some(
      (document) =>
        document.kind === documentFieldToKind[field as keyof typeof documentFieldToKind],
    );
  }
  return Boolean(candidate[field]);
}

function missingRequestedFields(candidate: CandidateForCompletion, requestedFields: string[]) {
  return requestedFields.filter((field) => !isFieldComplete(candidate, field));
}

function autoRequestedFields(candidate: CandidateForCompletion) {
  const requested = candidateCompletionFields.filter((field) => !isFieldComplete(candidate, field));
  if (!isFieldComplete(candidate, "aadhaarNumber")) requested.push("aadhaarNumber" as never);
  if (!isFieldComplete(candidate, "panNumber")) requested.push("panNumber" as never);
  if (!isFieldComplete(candidate, "aadhaarImage")) requested.push("aadhaarImage" as never);
  if (!isFieldComplete(candidate, "panImage")) requested.push("panImage" as never);
  return requested;
}

function normalizeRequestedFields(fields: string[] | undefined, candidate: CandidateForCompletion) {
  const requested = fields
    ? fields.filter((field) => allCompletionFields.has(field))
    : autoRequestedFields(candidate);
  return [...new Set(requested)];
}

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
  requestedFields?: string[];
  regenerate?: boolean;
}) {
  const candidate = await db.candidate.findFirst({
    where: { id: input.candidateId, organizationId: input.organizationId },
    include: { documents: { select: { kind: true } } },
  });
  if (!candidate) throw notFoundError();
  if (candidate.status !== "SELECTED" || candidate.hiringApprovalStatus !== "FINAL_HIRED")
    throw new AppError(
      "CONFLICT",
      "Candidate onboarding is locked until Master approves hiring and HR performs the final Hire Candidate action",
      409,
    );
  const requestedFields = normalizeRequestedFields(input.requestedFields, candidate);
  if (!requestedFields.length)
    throw new AppError("CONFLICT", "This candidate has no missing details", 409);
  const rawToken = tokenValue();
  const link = await db.$transaction(async (tx) => {
    await tx.candidateCompletionLink.updateMany({
      where: {
        organizationId: input.organizationId,
        candidateId: candidate.id,
        usedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
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
    include: { candidate: { include: { documents: true } } },
  });
  if (
    !link ||
    link.usedAt ||
    link.revokedAt ||
    link.expiresAt <= new Date() ||
    link.candidate.status !== "SELECTED" ||
    link.candidate.hiringApprovalStatus !== "FINAL_HIRED"
  )
    throw notFoundError();
  return link;
}

export async function getCandidateCompletionState(organizationId: string, candidateId: string) {
  const candidate = await db.candidate.findFirst({
    where: { id: candidateId, organizationId },
    select: {
      id: true,
      documents: { select: { kind: true } },
      completionLinks: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          requestedFields: true,
          expiresAt: true,
          usedAt: true,
          revokedAt: true,
          createdAt: true,
        },
      },
      ...Object.fromEntries(candidateCompletionFields.map((field) => [field, true])),
      aadhaarNumber: true,
      panNumber: true,
    },
  });
  if (!candidate) throw notFoundError();
  const latest = candidate.completionLinks[0];
  const requestedFields = latest ? (latest.requestedFields as string[]) : [];
  const missingFields = latest ? missingRequestedFields(candidate, requestedFields) : [];
  const now = new Date();
  const status = !latest
    ? "NOT_REQUESTED"
    : latest.usedAt
      ? "COMPLETED"
      : latest.revokedAt
        ? "REVOKED"
        : latest.expiresAt <= now
          ? "EXPIRED"
          : "ACTIVE";
  return {
    candidateId,
    status,
    requestedFields,
    missingFields,
    completedFields: requestedFields.filter((field) => !missingFields.includes(field)),
    progress: requestedFields.length
      ? Math.round(((requestedFields.length - missingFields.length) / requestedFields.length) * 100)
      : status === "COMPLETED"
        ? 100
        : 0,
    link: latest
      ? {
          id: latest.id,
          expiresAt: latest.expiresAt,
          usedAt: latest.usedAt,
          revokedAt: latest.revokedAt,
          createdAt: latest.createdAt,
        }
      : null,
  };
}

export async function listCandidateOnboarding(organizationId: string) {
  const candidates = await db.candidate.findMany({
    where: {
      organizationId,
      status: "SELECTED",
      hiringApprovalStatus: "FINAL_HIRED",
      employee: null,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      referenceNo: true,
      roleOfInterest: true,
      updatedAt: true,
      documents: { select: { kind: true } },
      applications: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { requisition: { select: { title: true } } },
      },
      completionLinks: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          requestedFields: true,
          expiresAt: true,
          usedAt: true,
          revokedAt: true,
          createdAt: true,
        },
      },
      ...Object.fromEntries(candidateCompletionFields.map((field) => [field, true])),
      aadhaarNumber: true,
      panNumber: true,
    },
  });
  const now = new Date();
  return candidates.map((candidate) => {
    const latest = candidate.completionLinks[0];
    const requestedFields = latest ? (latest.requestedFields as string[]) : [];
    const missingFields = latest ? missingRequestedFields(candidate, requestedFields) : [];
    const status = !latest
      ? "NOT_REQUESTED"
      : latest.usedAt
        ? "COMPLETED"
        : latest.revokedAt
          ? "REVOKED"
          : latest.expiresAt <= now
            ? "EXPIRED"
            : "ACTIVE";
    return {
      id: candidate.id,
      name: `${candidate.firstName} ${candidate.lastName}`,
      referenceNo: candidate.referenceNo,
      position: candidate.applications[0]?.requisition.title || candidate.roleOfInterest,
      updatedAt: candidate.updatedAt,
      status,
      requestedCount: requestedFields.length,
      missingFields,
      progress: requestedFields.length
        ? Math.round(
            ((requestedFields.length - missingFields.length) / requestedFields.length) * 100,
          )
        : 0,
      link: latest
        ? {
            id: latest.id,
            expiresAt: latest.expiresAt,
            usedAt: latest.usedAt,
            createdAt: latest.createdAt,
          }
        : null,
    };
  });
}

export async function revokeCandidateCompletionLink(input: {
  organizationId: string;
  candidateId: string;
  actorUserId: string;
  requestId?: string;
}) {
  const link = await db.candidateCompletionLink.findFirst({
    where: {
      organizationId: input.organizationId,
      candidateId: input.candidateId,
      usedAt: null,
      revokedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!link) throw notFoundError();
  const revoked = await db.$transaction(async (tx) => {
    const result = await tx.candidateCompletionLink.update({
      where: { id: link.id },
      data: { revokedAt: new Date() },
    });
    await tx.candidateActivity.create({
      data: {
        organizationId: input.organizationId,
        candidateId: input.candidateId,
        actorUserId: input.actorUserId,
        action: "CANDIDATE_COMPLETION_LINK_REVOKED",
        metadata: { linkId: link.id },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "CANDIDATE_COMPLETION_LINK_REVOKED",
      entityType: "CandidateCompletionLink",
      entityId: link.id,
      requestId: input.requestId,
    });
    return result;
  });
  return { id: revoked.id, revokedAt: revoked.revokedAt };
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
  finalize?: boolean;
}) {
  const link = await getCandidateCompletionLink(input.token);
  const allowed = new Set(link.requestedFields as string[]);
  const patch: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.fields))
    if (allowed.has(key) && value.trim()) patch[key] = value.trim();
  if (patch.aadhaarNumber) patch.aadhaarNumber = patch.aadhaarNumber.replace(/[\s-]/g, "");
  if (patch.panNumber) patch.panNumber = patch.panNumber.toUpperCase().replace(/\s/g, "");
  if (input.finalize && !input.consent)
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
  if (!Object.keys(patch).length && !input.documents.length && input.finalize)
    throw validationError({ fields: ["Provide at least one missing detail or identity document"] });
  return db.$transaction(async (tx) => {
    const activeLink = await tx.candidateCompletionLink.findFirst({
      where: {
        id: link.id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!activeLink) throw notFoundError();
    if (input.finalize) {
      const claimed = await tx.candidateCompletionLink.updateMany({
        where: { id: link.id, usedAt: null, revokedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw notFoundError();
    }
    const current = await tx.candidate.findFirst({
      where: { id: link.candidateId, organizationId: link.organizationId },
      include: { documents: { select: { kind: true } } },
    });
    if (!current) throw notFoundError();
    const candidate = await tx.candidate.update({ where: { id: link.candidateId }, data: patch });
    for (const document of input.documents) {
      const existing = await tx.candidateDocument.findFirst({
        where: {
          organizationId: link.organizationId,
          candidateId: link.candidateId,
          kind: document.kind,
        },
      });
      if (existing) {
        await tx.candidateDocument.update({
          where: { id: existing.id },
          data: {
            objectKey: document.objectKey,
            fileName: document.fileName,
            contentType: document.contentType,
            byteSize: document.byteSize,
          },
        });
      } else {
        await tx.candidateDocument.create({
          data: {
            organizationId: link.organizationId,
            candidateId: link.candidateId,
            kind: document.kind,
            objectKey: document.objectKey,
            fileName: document.fileName,
            contentType: document.contentType,
            byteSize: document.byteSize,
          },
        });
      }
    }
    const candidateAfterPatch = {
      ...(candidate as unknown as CandidateForCompletion),
      documents: [
        ...current.documents.filter(
          (item) => !input.documents.some((document) => document.kind === item.kind),
        ),
        ...input.documents,
      ],
    };
    const missing = missingRequestedFields(candidateAfterPatch, link.requestedFields as string[]);
    if (input.finalize && missing.length)
      throw validationError({ fields: missing.map((field) => `${field} is required`) });
    await tx.candidateActivity.create({
      data: {
        organizationId: link.organizationId,
        candidateId: link.candidateId,
        action: input.finalize ? "CANDIDATE_DETAILS_COMPLETED" : "CANDIDATE_DETAILS_SAVED",
        metadata: {
          fields: Object.keys(patch),
          documentKinds: input.documents.map((document) => document.kind),
        },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: link.organizationId,
      action: input.finalize ? "CANDIDATE_DETAILS_COMPLETED" : "CANDIDATE_DETAILS_SAVED",
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
