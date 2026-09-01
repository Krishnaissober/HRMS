import { describe, expect, it } from "vitest";
import { dashboardRangeSchema } from "@/modules/dashboards/schemas";
import { calculateRecruitmentMetrics } from "@/modules/dashboards/service";

describe("dashboard aggregation", () => {
  it("calculates only the SRS recruitment metrics from persisted-domain values", () => {
    const approvedAt = new Date("2026-01-01T00:00:00.000Z");
    const openedAt = new Date("2025-12-30T00:00:00.000Z");
    const respondedAt = new Date("2026-01-11T00:00:00.000Z");
    const metrics = calculateRecruitmentMetrics({
      applicationCount: 4,
      pipelineGroups: [
        { status: "APPLIED", _count: 3 },
        { status: "INTERVIEW", _count: 1 },
      ],
      openPositions: 2,
      interviewCount: 4,
      noShowCount: 1,
      submittedEvaluationCount: 4,
      hireRecommendationCount: 3,
      deliveredOfferCount: 2,
      acceptedOfferCount: 1,
      sourceApplications: [
        { candidate: { source: "ONLINE" }, offers: [{ status: "ACCEPTED" }] },
        { candidate: { source: "ONLINE" }, offers: [] },
        { candidate: { source: "WALK_IN" }, offers: [] },
      ],
      acceptedOffers: [
        {
          respondedAt,
          application: {
            createdAt: approvedAt,
            requisition: { approvedAt, openedAt, createdAt: openedAt },
          },
        },
      ],
    });

    expect(metrics).toMatchObject({
      applications: 4,
      pipelineCounts: { APPLIED: 3, INTERVIEW: 1 },
      openPositions: 2,
      interviewPassRate: 75,
      interviewNoShowRate: 25,
      offerAcceptanceRate: 50,
      averageTimeToHireDays: 10,
      averageTimeToFillDays: 12,
    });
    expect(metrics.sourceEffectiveness).toEqual([
      { source: "ONLINE", applications: 2, acceptedOffers: 1, acceptanceRate: 50 },
      { source: "WALK_IN", applications: 1, acceptedOffers: 0, acceptanceRate: 0 },
    ]);
  });

  it("validates dashboard date ranges", () => {
    expect(dashboardRangeSchema.parse({ from: "2026-01-01", to: "2026-01-31" })).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
    });
    expect(() => dashboardRangeSchema.parse({ from: "2026-02-01", to: "2026-01-01" })).toThrow();
  });
});
