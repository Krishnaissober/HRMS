import { db } from "@/lib/db";
import type { DashboardRange } from "@/modules/dashboards/schemas";

const deliveredOfferStatuses = ["SENT", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED"];

type PipelineGroup = { status: string; _count: number };
type SourceApplication = {
  candidate: { source: string };
  offers: { status: string }[];
};
type AcceptedOffer = {
  respondedAt: Date | null;
  application: {
    createdAt: Date;
    requisition: { approvedAt: Date | null; openedAt: Date | null; createdAt: Date };
  };
};

function percent(numerator: number, denominator: number) {
  return denominator ? Number(((numerator / denominator) * 100).toFixed(1)) : 0;
}

function averageDays(values: number[]) {
  return values.length
    ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
    : null;
}

export function calculateRecruitmentMetrics(input: {
  applicationCount: number;
  pipelineGroups: PipelineGroup[];
  openPositions: number;
  interviewCount: number;
  noShowCount: number;
  submittedEvaluationCount: number;
  hireRecommendationCount: number;
  deliveredOfferCount: number;
  acceptedOfferCount: number;
  sourceApplications: SourceApplication[];
  acceptedOffers: AcceptedOffer[];
}) {
  const sourceMap = new Map<string, { applications: number; acceptedOffers: number }>();
  for (const application of input.sourceApplications) {
    const source = application.candidate.source;
    const current = sourceMap.get(source) ?? { applications: 0, acceptedOffers: 0 };
    current.applications += 1;
    current.acceptedOffers += application.offers.some((offer) => offer.status === "ACCEPTED")
      ? 1
      : 0;
    sourceMap.set(source, current);
  }

  const acceptedWithResponse = input.acceptedOffers.filter(
    (offer): offer is AcceptedOffer & { respondedAt: Date } => Boolean(offer.respondedAt),
  );
  const millisecondsPerDay = 86_400_000;
  const timeToHireValues = acceptedWithResponse.flatMap((offer) =>
    offer.application.requisition.approvedAt
      ? [
          Math.max(
            0,
            (offer.respondedAt.getTime() - offer.application.requisition.approvedAt.getTime()) /
              millisecondsPerDay,
          ),
        ]
      : [],
  );
  const timeToFillValues = acceptedWithResponse.map((offer) => {
    const openedAt =
      offer.application.requisition.openedAt ?? offer.application.requisition.createdAt;
    return Math.max(0, (offer.respondedAt.getTime() - openedAt.getTime()) / millisecondsPerDay);
  });

  return {
    applications: input.applicationCount,
    pipelineCounts: Object.fromEntries(
      input.pipelineGroups.map((group) => [group.status, group._count]),
    ),
    openPositions: input.openPositions,
    interviewPassRate: percent(input.hireRecommendationCount, input.submittedEvaluationCount),
    interviewNoShowRate: percent(input.noShowCount, input.interviewCount),
    offerAcceptanceRate: percent(input.acceptedOfferCount, input.deliveredOfferCount),
    averageTimeToHireDays: averageDays(timeToHireValues),
    averageTimeToFillDays: averageDays(timeToFillValues),
    sourceEffectiveness: [...sourceMap.entries()]
      .map(([source, value]) => ({
        source,
        ...value,
        acceptanceRate: percent(value.acceptedOffers, value.applications),
      }))
      .sort((a, b) => a.source.localeCompare(b.source)),
    definitions: {
      interviewPassRate: "Submitted interview evaluations recommending Hire",
      interviewNoShowRate: "No-show interviews divided by scheduled interview records",
      offerAcceptanceRate: "Accepted offers divided by offers sent to candidates",
      timeToHire: "Requisition approval to accepted-offer response",
      timeToFill: "Requisition opening to accepted-offer response",
      sourceEffectiveness: "Applications and accepted offers grouped by candidate source",
    },
  };
}

function dateWhere(range: DashboardRange, field: "createdAt" | "scheduledStart") {
  if (!range.from && !range.to) return {};
  return {
    [field]: {
      ...(range.from ? { gte: new Date(`${range.from}T00:00:00.000Z`) } : {}),
      ...(range.to ? { lte: new Date(`${range.to}T23:59:59.999Z`) } : {}),
    },
  };
}

export async function recruitmentDashboard(organizationId: string, range: DashboardRange) {
  const applicationWhere = { organizationId, ...dateWhere(range, "createdAt") };
  const interviewWhere = { organizationId, ...dateWhere(range, "scheduledStart") };
  const offerWhere = { organizationId, ...dateWhere(range, "createdAt") };
  const evaluationWhere = { organizationId, status: "SUBMITTED", ...dateWhere(range, "createdAt") };

  const [
    applicationCount,
    pipelineGroups,
    openPositions,
    interviewCount,
    noShowCount,
    submittedEvaluationCount,
    hireRecommendationCount,
    deliveredOfferCount,
    acceptedOfferCount,
    sourceApplications,
    acceptedOffers,
    openRequisitions,
  ] = await Promise.all([
    db.application.count({ where: applicationWhere }),
    db.application.groupBy({
      where: applicationWhere,
      by: ["status"],
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    db.jobRequisition.count({ where: { organizationId, status: "PUBLISHED" } }),
    db.interview.count({ where: interviewWhere }),
    db.interview.count({ where: { ...interviewWhere, status: "NO_SHOW" } }),
    db.interviewEvaluation.count({ where: evaluationWhere }),
    db.interviewEvaluation.count({ where: { ...evaluationWhere, recommendation: "HIRE" } }),
    db.offer.count({ where: { ...offerWhere, status: { in: deliveredOfferStatuses } } }),
    db.offer.count({ where: { ...offerWhere, status: "ACCEPTED" } }),
    db.application.findMany({
      where: applicationWhere,
      select: {
        candidate: { select: { source: true } },
        offers: { select: { status: true } },
      },
    }),
    db.offer.findMany({
      where: { ...offerWhere, status: "ACCEPTED" },
      select: {
        respondedAt: true,
        application: {
          select: {
            createdAt: true,
            requisition: {
              select: { approvedAt: true, openedAt: true, createdAt: true },
            },
          },
        },
      },
    }),
    db.jobRequisition.findMany({
      where: { organizationId, status: "PUBLISHED" },
      select: {
        id: true,
        referenceNo: true,
        title: true,
        openedAt: true,
        _count: { select: { applications: true } },
      },
      orderBy: { openedAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    range: { from: range.from ?? null, to: range.to ?? null },
    ...calculateRecruitmentMetrics({
      applicationCount,
      pipelineGroups: (pipelineGroups as Array<{ status: string; _count: { _all: number } }>).map(
        (group) => ({
          status: group.status,
          _count: group._count._all,
        }),
      ),
      openPositions,
      interviewCount,
      noShowCount,
      submittedEvaluationCount,
      hireRecommendationCount,
      deliveredOfferCount,
      acceptedOfferCount,
      sourceApplications,
      acceptedOffers,
    }),
    openRequisitions,
  };
}

export async function hrDashboard(organizationId: string, userId: string, range: DashboardRange) {
  const [recruitment, notifications, tasks] = await Promise.all([
    recruitmentDashboard(organizationId, range),
    db.appNotification.findMany({
      where: { organizationId, userId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.workflowTask.findMany({
      where: { organizationId, assignedToUserId: userId, status: { not: "COMPLETED" } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  return {
    range: recruitment.range,
    overview: {
      applications: recruitment.applications,
      openPositions: recruitment.openPositions,
      pipelineCounts: recruitment.pipelineCounts,
    },
    kpis: {
      interviewNoShowRate: recruitment.interviewNoShowRate,
      offerAcceptanceRate: recruitment.offerAcceptanceRate,
      averageTimeToHireDays: recruitment.averageTimeToHireDays,
    },
    alerts: notifications,
    tasks,
  };
}
