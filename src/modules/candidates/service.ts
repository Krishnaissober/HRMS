import { writeAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { notFoundError, validationError } from "@/lib/errors";
import { createDownloadUrl, verifyStoredObject } from "@/lib/storage";
import { canTransition, type CandidateStatus } from "@/modules/candidates/constants";
import {
  createCandidateIntake,
  findOrganizationBySlug,
  getCandidate,
  updateCandidateStatus,
} from "@/modules/candidates/repository";

function assertDocumentScope(documents: Array<{ objectKey: string }>, orgId: string) {
  if (
    documents.some(
      (document) =>
        !document.objectKey.startsWith(`intake/${orgId}/`) &&
        !document.objectKey.startsWith(`candidate-intake/${orgId}/`),
    )
  ) {
    throw validationError({ documents: ["Document key is not valid for this organization"] });
  }
}

export async function submitPublicCandidate(input: {
  organizationSlug: string;
  source?: "ONLINE" | "WALK_IN";
  fields: Record<string, unknown>;
  documents: Array<{
    kind: string;
    objectKey: string;
    fileName: string;
    contentType: string;
    byteSize: number;
  }>;
  requestId?: string;
}) {
  const organization = await findOrganizationBySlug(input.organizationSlug);
  if (!organization) throw notFoundError();
  assertDocumentScope(input.documents, organization.id);
  for (const document of input.documents)
    await verifyStoredObject(document.objectKey, document.contentType, document.byteSize);
  return createCandidateIntake({
    organizationId: organization.id,
    source: input.source || "ONLINE",
    requisitionId: String(input.fields.requisitionId || ""),
    fields: input.fields,
    documents: input.documents,
    formData: { ...input.fields, documents: input.documents },
    requestId: input.requestId,
  });
}

export async function submitAuthenticatedCandidate(input: {
  organizationId: string;
  actorUserId: string;
  source: "ONLINE" | "WALK_IN";
  fields: Record<string, unknown>;
  documents: Array<{
    kind: string;
    objectKey: string;
    fileName: string;
    contentType: string;
    byteSize: number;
  }>;
  requestId?: string;
}) {
  assertDocumentScope(input.documents, input.organizationId);
  for (const document of input.documents)
    await verifyStoredObject(document.objectKey, document.contentType, document.byteSize);
  return createCandidateIntake({
    organizationId: input.organizationId,
    source: input.source,
    requisitionId: String(input.fields.requisitionId || ""),
    actorUserId: input.actorUserId,
    fields: input.fields,
    documents: input.documents,
    formData: { ...input.fields, documents: input.documents },
    requestId: input.requestId,
  });
}

export async function submitWalkInCandidate(input: {
  organizationId: string;
  actorUserId: string;
  fields: Record<string, unknown>;
  documents: Array<{
    kind: string;
    objectKey: string;
    fileName: string;
    contentType: string;
    byteSize: number;
  }>;
  requestId?: string;
}) {
  return submitAuthenticatedCandidate({ ...input, source: "WALK_IN" });
}

export async function changeCandidateStatus(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  status: CandidateStatus;
  reason?: string;
  notes?: string;
  requestId?: string;
}) {
  const current = await getCandidate(input.organizationId, input.id);
  if (!current) throw notFoundError();
  // Treat selecting the candidate's existing status as an idempotent no-op.
  // This keeps repeated clicks or stale forms from producing a misleading
  // invalid-transition error and, importantly, does not resend shortlist mail.
  if (current.status === input.status) return current;
  if (!canTransition(current.status as CandidateStatus, input.status))
    throw validationError({
      status: [`Invalid transition from ${current.status} to ${input.status}`],
    });
  if ((input.status === "HOLD" || input.status === "REJECTED") && !input.reason?.trim())
    throw validationError({ reason: ["A reason is required for hold or rejection"] });
  const result = await updateCandidateStatus(
    input.organizationId,
    input.id,
    input.status,
    input.reason,
    input.notes,
    input.actorUserId,
    input.requestId,
  );
  if (!result) throw notFoundError();
  return result.candidate;
}

export async function getCandidateDocumentUrl(input: {
  organizationId: string;
  actorUserId: string;
  candidateId: string;
  documentId: string;
  requestId?: string;
  download?: boolean;
}) {
  const document = await db.candidateDocument.findFirst({
    where: {
      id: input.documentId,
      candidateId: input.candidateId,
      organizationId: input.organizationId,
    },
  });
  if (!document) throw notFoundError();
  const url = await createDownloadUrl(document.objectKey, 900, input.download);
  await db.$transaction(async (tx) =>
    writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "CANDIDATE_DOCUMENT_DOWNLOADED",
      entityType: "CandidateDocument",
      entityId: document.id,
      requestId: input.requestId,
      metadata: { candidateId: input.candidateId },
    }),
  );
  return { url };
}

export async function checkInCandidateVisit(input: {
  organizationId: string;
  actorUserId: string;
  candidateId: string;
  visitId?: string;
  visitDate?: string;
  purpose?: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const candidate = await tx.candidate.findFirst({
      where: { id: input.candidateId, organizationId: input.organizationId, source: "WALK_IN" },
    });
    if (!candidate) throw notFoundError();
    const visit = input.visitId
      ? await tx.candidateVisit.findFirst({
          where: {
            id: input.visitId,
            candidateId: candidate.id,
            organizationId: input.organizationId,
          },
        })
      : await tx.candidateVisit.create({
          data: {
            organizationId: input.organizationId,
            candidateId: candidate.id,
            visitDate: input.visitDate ? new Date(input.visitDate) : new Date(),
            purpose: input.purpose || undefined,
          },
        });
    if (!visit) throw notFoundError();
    if (visit.status === "CHECKED_OUT")
      throw validationError({ visitId: ["A checked-out visit cannot be checked in again"] });
    const updated = await tx.candidateVisit.update({
      where: { id: visit.id },
      data: {
        status: "CHECKED_IN",
        checkedInAt: visit.checkedInAt || new Date(),
        checkInActorUserId: input.actorUserId,
        purpose: input.purpose || visit.purpose,
      },
    });
    await tx.candidateActivity.create({
      data: {
        organizationId: input.organizationId,
        candidateId: candidate.id,
        actorUserId: input.actorUserId,
        action: "WALK_IN_CHECKED_IN",
        note: updated.purpose,
        metadata: { visitId: updated.id },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "WALK_IN_CHECKED_IN",
      entityType: "CandidateVisit",
      entityId: updated.id,
      requestId: input.requestId,
      metadata: { candidateId: candidate.id },
    });
    return updated;
  });
}

export async function checkOutCandidateVisit(input: {
  organizationId: string;
  actorUserId: string;
  candidateId: string;
  visitId: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const visit = await tx.candidateVisit.findFirst({
      where: {
        id: input.visitId,
        candidateId: input.candidateId,
        organizationId: input.organizationId,
        candidate: { source: "WALK_IN" },
      },
    });
    if (!visit) throw notFoundError();
    if (visit.status !== "CHECKED_IN")
      throw validationError({ visitId: ["Only a checked-in visit can be checked out"] });
    const checkedOutAt = new Date();
    const updated = await tx.candidateVisit.update({
      where: { id: visit.id },
      data: {
        status: "CHECKED_OUT",
        checkedOutAt,
        checkOutActorUserId: input.actorUserId,
        durationMinutes: visit.checkedInAt
          ? Math.max(0, Math.floor((checkedOutAt.getTime() - visit.checkedInAt.getTime()) / 60000))
          : null,
      },
    });
    await tx.candidateActivity.create({
      data: {
        organizationId: input.organizationId,
        candidateId: input.candidateId,
        actorUserId: input.actorUserId,
        action: "WALK_IN_CHECKED_OUT",
        metadata: { visitId: updated.id },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "WALK_IN_CHECKED_OUT",
      entityType: "CandidateVisit",
      entityId: updated.id,
      requestId: input.requestId,
      metadata: { candidateId: input.candidateId },
    });
    return updated;
  });
}
