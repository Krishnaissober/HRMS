import { createHash, randomBytes } from "node:crypto";
import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditEvent } from "@/lib/audit";
import { emailProvider } from "@/lib/notifications";
import { env } from "@/lib/env";
import { notFoundError, validationError, AppError } from "@/lib/errors";
import { getOffer } from "@/modules/hiring/repository";
import { canRecordHiringDecision, type HiringDecisionType } from "@/modules/hiring/constants";

function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
function parseSteps(value: unknown) { return Array.isArray(value) ? value.filter((step): step is string => typeof step === "string" && step.trim().length > 0) : []; }

export async function createHiringDecision(input: { organizationId: string; actorUserId: string; applicationId: string; decision: HiringDecisionType; reason?: string; notes?: string; requestId?: string }) {
  if ((input.decision === "HOLD" || input.decision === "REJECT") && !input.reason?.trim()) throw validationError({ reason: ["A reason is required for hold or rejection"] });
  return db.$transaction(async (tx) => {
    const application = await tx.application.findFirst({ where: { id: input.applicationId, organizationId: input.organizationId }, include: { candidate: true } });
    if (!application) throw notFoundError();
    const completedInterview = await tx.interview.findFirst({ where: { organizationId: input.organizationId, candidateId: application.candidateId, applicationId: application.id, status: "COMPLETED" }, select: { id: true } });
    if (!completedInterview) throw new AppError("CONFLICT", "Complete the interview before recording a hiring decision.", 409);
    if (!canRecordHiringDecision(application.candidate.status, input.decision)) throw new AppError("CONFLICT", `The ${input.decision} decision is not valid from candidate status ${application.candidate.status}`, 409);
    const nextStatus = input.decision === "HIRE" ? "SELECTED" : input.decision === "HOLD" ? "HOLD" : "REJECTED";
    const candidateUpdate = await tx.candidate.updateMany({ where: { id: application.candidateId, organizationId: input.organizationId, status: application.candidate.status }, data: { status: nextStatus, statusReason: input.reason?.trim() || null, statusNotes: input.notes?.trim() || null } });
    if (candidateUpdate.count !== 1) throw new AppError("CONFLICT", "The candidate status changed while the decision was being recorded", 409);
    const applicationUpdate = await tx.application.updateMany({ where: { id: application.id, organizationId: input.organizationId, status: application.status }, data: { status: nextStatus } });
    if (applicationUpdate.count !== 1) throw new AppError("CONFLICT", "The application status changed while the decision was being recorded", 409);
    const decision = await tx.hiringDecision.create({ data: { organizationId: input.organizationId, applicationId: application.id, candidateId: application.candidateId, decision: input.decision, reason: input.reason?.trim() || null, notes: input.notes?.trim() || null, actorUserId: input.actorUserId } });
    await tx.candidateActivity.create({ data: { organizationId: input.organizationId, candidateId: application.candidateId, actorUserId: input.actorUserId, action: "HIRING_DECISION_RECORDED", fromStatus: application.candidate.status, toStatus: nextStatus, note: input.notes?.trim() || input.reason?.trim(), metadata: { applicationId: application.id, decision: input.decision, hiringDecisionId: decision.id } } });
    await writeAuditEvent(tx, { organizationId: input.organizationId, actorUserId: input.actorUserId, action: "HIRING_DECISION_RECORDED", entityType: "HiringDecision", entityId: decision.id, requestId: input.requestId, metadata: { applicationId: application.id, candidateId: application.candidateId, decision: input.decision, reason: input.reason } });
    return decision;
  });
}

export async function createOfferTemplate(input: { organizationId: string; actorUserId: string; name: string; body: string; approvalRequired: boolean; approvalSteps: string[]; requestId?: string }) {
  const template = await db.$transaction(async (tx) => {
    const result = await tx.offerTemplate.create({ data: { organizationId: input.organizationId, name: input.name, body: input.body, approvalRequired: input.approvalRequired, approvalSteps: input.approvalSteps as PrismaTypes.InputJsonValue, createdByUserId: input.actorUserId } });
    await writeAuditEvent(tx, { organizationId: input.organizationId, actorUserId: input.actorUserId, action: "OFFER_TEMPLATE_CREATED", entityType: "OfferTemplate", entityId: result.id, requestId: input.requestId });
    return result;
  });
  return template;
}

export async function createOffer(input: { organizationId: string; actorUserId: string; applicationId: string; hiringDecisionId: string; templateId: string; compensationSummary?: string; issueDate?: string | null; proposedStartDate?: string | null; expiryDate?: string | null; requestId?: string }) {
  try {
    return await db.$transaction(async (tx) => {
    const decision = await tx.hiringDecision.findFirst({ where: { id: input.hiringDecisionId, organizationId: input.organizationId, applicationId: input.applicationId, decision: "HIRE" } });
    const template = await tx.offerTemplate.findFirst({ where: { id: input.templateId, organizationId: input.organizationId, status: "ACTIVE" } });
    const application = await tx.application.findFirst({ where: { id: input.applicationId, organizationId: input.organizationId }, include: { candidate: true } });
    if (!decision || !template || !application) throw notFoundError();
    const existingOffer = await tx.offer.findUnique({ where: { hiringDecisionId: decision.id }, select: { id: true } });
    if (existingOffer) throw new AppError("CONFLICT", "An offer already exists for this hiring decision", 409);
    const steps = template.approvalRequired ? (parseSteps(template.approvalSteps).length ? parseSteps(template.approvalSteps) : ["Approval"]) : [];
    const status = template.approvalRequired ? "PENDING_APPROVAL" : "APPROVED";
    const offer = await tx.offer.create({ data: { organizationId: input.organizationId, candidateId: application.candidateId, applicationId: application.id, hiringDecisionId: decision.id, templateId: template.id, status, compensationSummary: input.compensationSummary?.trim() || null, issueDate: input.issueDate ? new Date(input.issueDate) : null, proposedStartDate: input.proposedStartDate ? new Date(input.proposedStartDate) : null, expiryDate: input.expiryDate ? new Date(input.expiryDate) : null, createdByUserId: input.actorUserId, approvals: steps.length ? { create: steps.map((_, index) => ({ organizationId: input.organizationId, stepOrder: index + 1 })) } : undefined } });
    await writeAuditEvent(tx, { organizationId: input.organizationId, actorUserId: input.actorUserId, action: "OFFER_CREATED", entityType: "Offer", entityId: offer.id, requestId: input.requestId, metadata: { applicationId: application.id, hiringDecisionId: decision.id, status } });
    return offer;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError("CONFLICT", "An offer already exists for this hiring decision", 409);
    throw error;
  }
}

export async function approveOffer(input: { organizationId: string; actorUserId: string; id: string; comments?: string; requestId?: string }) {
  return db.$transaction(async (tx) => {
    const offer = await tx.offer.findFirst({ where: { id: input.id, organizationId: input.organizationId }, include: { approvals: { orderBy: { stepOrder: "asc" } } } });
    if (!offer) throw notFoundError();
    if (offer.status !== "PENDING_APPROVAL") throw validationError({ status: ["Only pending offers can be approved"] });
    const pending = offer.approvals.find((approval) => approval.status === "PENDING");
    if (!pending) throw validationError({ status: ["The offer has no pending approval step"] });
    await tx.offerApproval.update({ where: { id: pending.id }, data: { status: "APPROVED", actorUserId: input.actorUserId, comments: input.comments?.trim() || null, actedAt: new Date() } });
    const remaining = offer.approvals.some((approval) => approval.id !== pending.id && approval.status === "PENDING");
    const updated = await tx.offer.update({ where: { id: offer.id }, data: { status: remaining ? "PENDING_APPROVAL" : "APPROVED" } });
    await writeAuditEvent(tx, { organizationId: input.organizationId, actorUserId: input.actorUserId, action: "OFFER_APPROVED", entityType: "Offer", entityId: offer.id, requestId: input.requestId, metadata: { stepOrder: pending.stepOrder, remaining } });
    return updated;
  });
}

export async function sendOffer(input: { organizationId: string; actorUserId: string; id: string; requestId?: string }) {
  const offer = await getOffer(input.organizationId, input.id);
  if (!offer) throw notFoundError();
  if (!["APPROVED", "SENT"].includes(offer.status)) throw validationError({ status: ["Only approved offers or failed deliveries can be sent"] });
  if (offer.expiryDate && offer.expiryDate <= new Date()) throw validationError({ expiryDate: ["The offer has expired"] });
  const existingDelivery = offer.deliveries[0];
  if (offer.status === "SENT" && existingDelivery?.status !== "FAILED") return { offer, delivery: existingDelivery, deliveryStatus: existingDelivery?.status || "QUEUED" };
  const token = randomBytes(32).toString("hex");
  const responseUrl = `${env.APP_URL}/offer-response?token=${token}`;
  const queued = await db.$transaction(async (tx) => {
    if (existingDelivery?.status === "FAILED") {
      const updated = await tx.offer.update({ where: { id: offer.id }, data: { responseTokenHash: hashToken(token), sentAt: new Date() } });
      const deliveryUpdate = await tx.offerDelivery.updateMany({ where: { id: existingDelivery.id, status: "FAILED" }, data: { status: "QUEUED", attemptCount: { increment: 1 }, lastError: null, queuedAt: new Date() } });
      if (deliveryUpdate.count !== 1) throw new AppError("CONFLICT", "Offer delivery is already being retried", 409);
      const delivery = await tx.offerDelivery.findUniqueOrThrow({ where: { id: existingDelivery.id } });
      await writeAuditEvent(tx, { organizationId: input.organizationId, actorUserId: input.actorUserId, action: "OFFER_SEND_RETRY_QUEUED", entityType: "Offer", entityId: offer.id, requestId: input.requestId });
      return { offer: updated, delivery };
    }
    const updatedCount = await tx.offer.updateMany({ where: { id: offer.id, organizationId: input.organizationId, status: "APPROVED" }, data: { status: "SENT", sentAt: new Date(), responseTokenHash: hashToken(token) } });
    if (updatedCount.count !== 1) throw new AppError("CONFLICT", "The offer changed while send was being queued", 409);
    const updated = await tx.offer.findUniqueOrThrow({ where: { id: offer.id } });
    const delivery = await tx.offerDelivery.create({ data: { organizationId: input.organizationId, offerId: offer.id, idempotencyKey: `offer-send:${offer.id}` } });
    await writeAuditEvent(tx, { organizationId: input.organizationId, actorUserId: input.actorUserId, action: "OFFER_SENT", entityType: "Offer", entityId: offer.id, requestId: input.requestId, metadata: { deliveryStatus: "QUEUED" } });
    return { offer: updated, delivery };
  });
  try {
    const deliveryResult = await emailProvider().send({ recipient: offer.candidate.email, subject: `Offer for ${offer.application.requisition.title}`, body: `Please review your offer and respond here: ${responseUrl}`, template: "OFFER_AVAILABLE" });
    const delivery = await db.$transaction(async (tx) => {
      const result = await tx.offerDelivery.update({ where: { id: queued.delivery.id }, data: { status: "SUCCEEDED", providerMessageId: deliveryResult.providerMessageId, deliveredAt: new Date(), lastError: null } });
      await writeAuditEvent(tx, { organizationId: input.organizationId, actorUserId: input.actorUserId, action: "OFFER_DELIVERY_SUCCEEDED", entityType: "Offer", entityId: offer.id, requestId: input.requestId });
      return result;
    });
    return { offer: queued.offer, delivery, deliveryStatus: "SUCCEEDED", responseUrl };
  } catch (error) {
    const delivery = await db.$transaction(async (tx) => {
      const result = await tx.offerDelivery.update({ where: { id: queued.delivery.id }, data: { status: "FAILED", lastError: error instanceof Error ? error.message.slice(0, 500) : "Delivery failed" } });
      await writeAuditEvent(tx, { organizationId: input.organizationId, actorUserId: input.actorUserId, action: "OFFER_DELIVERY_FAILED", entityType: "Offer", entityId: offer.id, requestId: input.requestId });
      return result;
    });
    return { offer: queued.offer, delivery, deliveryStatus: "FAILED", responseUrl };
  }
}

export async function respondToOffer(input: { token: string; response: "ACCEPTED" | "DECLINED"; notes?: string; requestId?: string }) {
  return db.$transaction(async (tx) => {
    const offer = await tx.offer.findFirst({ where: { responseTokenHash: hashToken(input.token) }, include: { candidate: true } });
    if (!offer) throw notFoundError();
    if (!["SENT", "VIEWED"].includes(offer.status)) throw validationError({ status: ["This offer is not available for response"] });
    if (offer.expiryDate && offer.expiryDate <= new Date()) {
      await tx.offer.update({ where: { id: offer.id }, data: { status: "EXPIRED" } });
      throw validationError({ status: ["This offer has expired"] });
    }
    const updated = await tx.offer.update({ where: { id: offer.id }, data: { status: input.response, respondedAt: new Date(), responseNotes: input.notes?.trim() || null, responseTokenHash: null } });
    await tx.candidateActivity.create({ data: { organizationId: offer.organizationId, candidateId: offer.candidateId, action: "OFFER_RESPONSE_RECORDED", toStatus: input.response, note: input.notes?.trim(), metadata: { offerId: offer.id } } });
    await writeAuditEvent(tx, { organizationId: offer.organizationId, action: `OFFER_${input.response}`, entityType: "Offer", entityId: offer.id, requestId: input.requestId, metadata: { candidateId: offer.candidateId } });
    return updated;
  });
}

export async function viewOffer(input: { token: string; requestId?: string }) {
  return db.$transaction(async (tx) => {
    const offer = await tx.offer.findFirst({ where: { responseTokenHash: hashToken(input.token) }, include: { candidate: true, application: { include: { requisition: true } } } });
    if (!offer) throw notFoundError();
    if (!["SENT", "VIEWED"].includes(offer.status)) throw validationError({ status: ["This offer is not available to view"] });
    const updated = offer.status === "SENT" ? await tx.offer.update({ where: { id: offer.id }, data: { status: "VIEWED", viewedAt: new Date() } }) : offer;
    if (offer.status === "SENT") await writeAuditEvent(tx, { organizationId: offer.organizationId, action: "OFFER_VIEWED", entityType: "Offer", entityId: offer.id, requestId: input.requestId });
    return { id: updated.id, status: updated.status, candidateName: `${offer.candidate.firstName} ${offer.candidate.lastName}`, position: offer.application.requisition.title, compensationSummary: offer.compensationSummary, expiryDate: offer.expiryDate };
  });
}

export async function generateOfferPdf(organizationId: string, id: string) {
  const offer = await getOffer(organizationId, id);
  if (!offer) throw notFoundError();
  if (["DRAFT", "PENDING_APPROVAL"].includes(offer.status)) throw new AppError("FORBIDDEN", "The offer is not available for download", 403);
  return offer;
}
