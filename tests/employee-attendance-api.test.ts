import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forbiddenError, unauthenticatedError } from "@/lib/errors";

const {
  getAuthenticatedContext,
  requirePermission,
  checkInEmployee,
  checkOutEmployee,
  createShift,
  assignShift,
  createHoliday,
  requestCorrection,
  reviewCorrection,
  attendanceCalendar,
} = vi.hoisted(() => ({
  getAuthenticatedContext: vi.fn(),
  requirePermission: vi.fn(),
  checkInEmployee: vi.fn(),
  checkOutEmployee: vi.fn(),
  createShift: vi.fn(),
  assignShift: vi.fn(),
  createHoliday: vi.fn(),
  requestCorrection: vi.fn(),
  reviewCorrection: vi.fn(),
  attendanceCalendar: vi.fn(),
}));
vi.mock("@/lib/tenant", () => ({ getAuthenticatedContext }));
vi.mock("@/lib/rbac", () => ({ requirePermission }));
vi.mock("@/modules/employee-attendance/service", () => ({
  checkInEmployee,
  checkOutEmployee,
  createShift,
  assignShift,
  createHoliday,
  requestCorrection,
  reviewCorrection,
  attendanceCalendar,
}));

import { POST as checkInRoute } from "@/app/api/v1/attendance/employee/check-in/route";
import { POST as checkOutRoute } from "@/app/api/v1/attendance/employee/check-out/route";
import { POST as shiftRoute } from "@/app/api/v1/shifts/route";
import { POST as assignmentRoute } from "@/app/api/v1/rosters/assignments/route";
import { POST as holidayRoute } from "@/app/api/v1/holidays/route";
import { POST as correctionRoute } from "@/app/api/v1/attendance/employee/corrections/route";
import { PATCH as reviewRoute } from "@/app/api/v1/attendance/employee/corrections/[id]/route";
import { GET as calendarRoute } from "@/app/api/v1/attendance/employee/calendar/route";

const context = {
  organizationId: "org-a",
  session: { user: { id: "user-a", email: "employee@example.test" } },
} as never;
function request(url: string, method = "POST", body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", "x-organization-id": "org-a" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("employee attendance API authorization and validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedContext.mockResolvedValue(context);
    requirePermission.mockResolvedValue(undefined);
    checkInEmployee.mockResolvedValue({ id: "attendance-1", status: "PRESENT" });
    checkOutEmployee.mockResolvedValue({ id: "attendance-1", durationMinutes: 480 });
    createShift.mockResolvedValue({ id: "shift-1" });
    assignShift.mockResolvedValue({ id: "assignment-1" });
    createHoliday.mockResolvedValue({ id: "holiday-1" });
    requestCorrection.mockResolvedValue({ id: "correction-1", status: "REQUESTED" });
    reviewCorrection.mockResolvedValue({ id: "correction-1", status: "APPROVED" });
    attendanceCalendar.mockResolvedValue({ view: "month", days: [] });
  });
  it("protects authenticated employee check-in and forwards identity without a client employee id", async () => {
    getAuthenticatedContext.mockRejectedValueOnce(unauthenticatedError());
    expect((await checkInRoute(request("/api/v1/attendance/employee/check-in"))).status).toBe(401);
    getAuthenticatedContext.mockResolvedValue(context);
    requirePermission.mockRejectedValueOnce(forbiddenError());
    expect((await checkInRoute(request("/api/v1/attendance/employee/check-in"))).status).toBe(403);
    requirePermission.mockResolvedValue(undefined);
    expect((await checkInRoute(request("/api/v1/attendance/employee/check-in"))).status).toBe(201);
    expect(checkInEmployee).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        actorUserId: "user-a",
        userEmail: "employee@example.test",
      }),
    );
  });
  it("protects check-out and forwards the authenticated identity", async () => {
    expect((await checkOutRoute(request("/api/v1/attendance/employee/check-out"))).status).toBe(
      200,
    );
    expect(checkOutEmployee).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-a", userEmail: "employee@example.test" }),
    );
  });
  it("validates shift, roster and holiday payloads at the API boundary", async () => {
    expect(
      (
        await shiftRoute(
          request("/api/v1/shifts", "POST", {
            name: "Day",
            startTime: "bad",
            endTime: "17:00",
            timezone: "UTC",
          }),
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await shiftRoute(
          request("/api/v1/shifts", "POST", {
            name: "Day",
            startTime: "09:00",
            endTime: "17:00",
            timezone: "UTC",
          }),
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await assignmentRoute(
          request("/api/v1/rosters/assignments", "POST", {
            employeeId: "employee-1",
            shiftId: "shift-1",
            startDate: "2026-08-18",
          }),
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await holidayRoute(
          request("/api/v1/holidays", "POST", { name: "Holiday", holidayDate: "2026-08-18" }),
        )
      ).status,
    ).toBe(201);
  });
  it("protects correction request and review permissions", async () => {
    expect(
      (
        await correctionRoute(
          request("/api/v1/attendance/employee/corrections", "POST", {
            attendanceId: "attendance-1",
            requestedCheckOutAt: "2026-08-18T17:00:00.000Z",
            reason: "Missed checkout",
          }),
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await reviewRoute(
          request("/api/v1/attendance/employee/corrections/correction-1", "PATCH", {
            status: "APPROVED",
          }),
          { params: Promise.resolve({ id: "correction-1" }) },
        )
      ).status,
    ).toBe(200);
    requirePermission.mockRejectedValueOnce(forbiddenError());
    expect(
      (
        await reviewRoute(
          request("/api/v1/attendance/employee/corrections/correction-1", "PATCH", {
            status: "APPROVED",
          }),
          { params: Promise.resolve({ id: "correction-1" }) },
        )
      ).status,
    ).toBe(403);
  });
  it("protects and validates day, week and month calendar queries", async () => {
    for (const view of ["day", "week", "month"]) {
      const response = await calendarRoute(
        request(`/api/v1/attendance/employee/calendar?view=${view}&date=2026-08-18`, "GET"),
      );
      expect(response.status).toBe(200);
      expect(attendanceCalendar).toHaveBeenCalledWith(
        "org-a",
        expect.objectContaining({ view, date: "2026-08-18" }),
      );
    }
    expect(
      (
        await calendarRoute(
          request("/api/v1/attendance/employee/calendar?view=year&date=2026-08-18", "GET"),
        )
      ).status,
    ).toBe(422);
    requirePermission.mockRejectedValueOnce(forbiddenError());
    expect(
      (
        await calendarRoute(
          request("/api/v1/attendance/employee/calendar?view=day&date=2026-08-18", "GET"),
        )
      ).status,
    ).toBe(403);
  });
});
