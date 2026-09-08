import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({ db: { attendanceRecord: { findMany: vi.fn() } } }));
vi.mock("@/lib/db", () => ({ db }));

import { summarizeAttendance } from "@/modules/employee-attendance/repository";

describe("employee attendance report aggregation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aggregates every persisted filtered record rather than one display page", async () => {
    db.attendanceRecord.findMany.mockResolvedValue([
      { durationMinutes: 480, overtimeMinutes: 30, approvedOvertimeMinutes: 20, status: "LATE" },
      {
        durationMinutes: 420,
        overtimeMinutes: 15,
        approvedOvertimeMinutes: null,
        status: "HOLIDAY",
      },
      {
        durationMinutes: 60,
        overtimeMinutes: null,
        approvedOvertimeMinutes: null,
        status: "PRESENT",
      },
    ]);
    await expect(
      summarizeAttendance("org-a", {
        employeeId: "employee-a",
        from: "2026-08-01",
        to: "2026-08-31",
      }),
    ).resolves.toEqual({
      durationMinutes: 960,
      overtimeMinutes: 35,
      lateCount: 1,
      holidayCount: 1,
    });
    expect(db.attendanceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-a", employeeId: "employee-a" }),
      }),
    );
  });
});
