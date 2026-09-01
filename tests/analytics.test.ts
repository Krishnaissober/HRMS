import { describe, expect, it } from "vitest";
import { analyticsQuerySchema } from "@/modules/analytics/schemas";
import { aggregateSalaryComponents, analyticsCsv, analyticsDateRange, calculateAttendanceRates, calculateCompletion, employeeStatusAtEnd, temporalGroups } from "@/modules/analytics/service";

describe("Phase 11 analytics calculations", () => {
  it("calculates attendance and completion rates with zero-safe denominators", () => {
    expect(calculateAttendanceRates({ total: 10, present: 8, absent: 1, late: 2 })).toEqual({ attendanceRate: 80, absenteeismRate: 10, lateArrivalRate: 20 });
    expect(calculateAttendanceRates({ total: 0, present: 0, absent: 0, late: 0 })).toEqual({ attendanceRate: 0, absenteeismRate: 0, lateArrivalRate: 0 });
    expect(calculateCompletion({ total: 4, completed: 3 })).toBe(75);
    expect(calculateCompletion({ total: 0, completed: 0 })).toBe(0);
  });

  it("validates date boundaries and only confirmed filters", () => {
    expect(analyticsQuerySchema.parse({ from: "2026-01-01", to: "2026-01-31", department: "People" })).toEqual({ from: "2026-01-01", to: "2026-01-31", department: "People" });
    expect(() => analyticsQuerySchema.parse({ from: "2026-02-01", to: "2026-01-01" })).toThrow();
    expect(() => analyticsQuerySchema.parse({ status: "invented" })).toThrow();
  });

  it("creates a deterministic CSV representation without exposing object syntax", () => {
    const csv = analyticsCsv({ applications: 2, pipeline: [{ stage: "APPLIED", count: 2 }] });
    expect(csv).toContain('"applications","2"');
    expect(csv).toContain('"pipeline[0].stage","APPLIED"');
    expect(csv).not.toContain("[object Object]");
  });

  it("uses organization timezone for inclusive local-day and month boundaries", () => {
    const kolkata = analyticsDateRange({ from: "2026-01-01", to: "2026-01-31" }, "Asia/Kolkata");
    expect(kolkata.gte?.toISOString()).toBe("2025-12-31T18:30:00.000Z");
    expect(kolkata.lt?.toISOString()).toBe("2026-01-31T18:30:00.000Z");
    const newYork = analyticsDateRange({ from: "2026-03-08", to: "2026-03-08" }, "America/New_York");
    expect(newYork.gte?.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(newYork.lt?.toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });

  it("aggregates persisted payroll component arrays", () => {
    expect(aggregateSalaryComponents([{ components: [{ name: "Housing", amount: 100 }, { name: "Tax", amount: 25 }] }, { components: [{ name: "Housing", amount: 50 }] }])).toEqual([{ label: "Housing", total: 150 }, { label: "Tax", total: 25 }]);
  });

  it("builds temporal trends and reconstructs employee status at a period boundary", () => {
    expect(temporalGroups([{ date: new Date("2026-01-31T20:00:00Z"), status: "PRESENT" }, { date: new Date("2026-02-01T01:00:00Z"), status: "PRESENT" }], "Asia/Kolkata")).toEqual([{ date: "2026-02-01", status: "PRESENT", count: 2 }]);
    expect(employeeStatusAtEnd({ status: "INACTIVE", history: [{ fromValue: "ACTIVE", effectiveDate: new Date("2026-03-01T00:00:00Z") }] }, new Date("2026-02-01T00:00:00Z"))).toBe("ACTIVE");
  });
});
