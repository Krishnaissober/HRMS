import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const offerInclude = {
  candidate: {
    select: { id: true, referenceNo: true, firstName: true, lastName: true, email: true },
  },
  application: {
    select: {
      id: true,
      referenceNo: true,
      status: true,
      requisition: { select: { referenceNo: true, title: true } },
    },
  },
  hiringDecision: { include: { actor: { select: { id: true, name: true, email: true } } } },
  template: true,
  approvals: {
    orderBy: { stepOrder: "asc" as const },
    include: { actor: { select: { id: true, name: true, email: true } } },
  },
  deliveries: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.OfferInclude;

export const hiringDecisionInclude = {
  actor: { select: { id: true, name: true, email: true } },
  candidate: { select: { id: true, referenceNo: true, firstName: true, lastName: true } },
  application: { select: { id: true, referenceNo: true, status: true } },
} satisfies Prisma.HiringDecisionInclude;

export async function listHiringDecisions(organizationId: string, applicationId?: string) {
  return db.hiringDecision.findMany({
    where: { organizationId, ...(applicationId ? { applicationId } : {}) },
    orderBy: { createdAt: "desc" },
    include: hiringDecisionInclude,
  });
}

export async function listOfferTemplates(organizationId: string) {
  return db.offerTemplate.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
}

export async function listOffers(
  organizationId: string,
  query: { status?: string; page: number; pageSize: number },
) {
  const where = { organizationId, ...(query.status ? { status: query.status } : {}) };
  const [items, total] = await db.$transaction([
    db.offer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: offerInclude,
    }),
    db.offer.count({ where }),
  ]);
  return { items, total };
}

export async function getOffer(organizationId: string, id: string) {
  return db.offer.findFirst({ where: { id, organizationId }, include: offerInclude });
}
