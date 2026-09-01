import { describe, expect, it } from "vitest";
import { calendarRange, isWeeklyOff, validateAttendanceStatusChange } from "@/modules/employee-attendance/rules";

describe("employee attendance rules", () => {
  it("builds exact day, Monday-to-Sunday week, and calendar-month ranges", () => {
    expect(calendarRange("day", "2026-08-18")).toEqual({ from: "2026-08-18", to: "2026-08-18" });
    expect(calendarRange("week", "2026-08-18")).toEqual({ from: "2026-08-17", to: "2026-08-23" });
    expect(calendarRange("month", "2026-08-18")).toEqual({ from: "2026-08-01", to: "2026-08-31" });
  });

  it("uses assignment weekly offs before shift defaults", () => {
    expect(isWeeklyOff(new Date("2026-08-18T00:00:00.000Z"), "2", "0,6")).toBe(true);
    expect(isWeeklyOff(new Date("2026-08-16T00:00:00.000Z"), null, "0,6")).toBe(true);
  });

  it("rejects attendance states that conflict with persisted calculations", () => {
    const base = { current: "PRESENT" as const, checkInAt: new Date(), checkOutAt: null, lateArrivalMinutes: null, overtimeMinutes: null, holiday: false, weeklyOff: false };
    expect(() => validateAttendanceStatusChange({ ...base, target: "ABSENT" })).toThrowError(/validation/i);
    expect(() => validateAttendanceStatusChange({ ...base, target: "OVERTIME" })).toThrowError(/validation/i);
    expect(() => validateAttendanceStatusChange({ ...base, target: "HOLIDAY" })).toThrowError(/validation/i);
  });
});
