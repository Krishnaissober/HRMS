import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forbiddenError, unauthenticatedError } from "@/lib/errors";
const mocks = vi.hoisted(() => ({
  getAuthenticatedContext: vi.fn(),
  requirePermission: vi.fn(),
  createLeaveType: vi.fn(),
  setLeaveBalance: vi.fn(),
  requestLeave: vi.fn(),
  decideLeave: vi.fn(),
  listLeaveTypes: vi.fn(),
  listLeaveRequests: vi.fn(),
}));
vi.mock("@/lib/tenant", () => ({ getAuthenticatedContext: mocks.getAuthenticatedContext }));
vi.mock("@/lib/rbac", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/modules/leave/service", () => ({
  createLeaveType: mocks.createLeaveType,
  setLeaveBalance: mocks.setLeaveBalance,
  requestLeave: mocks.requestLeave,
  decideLeave: mocks.decideLeave,
}));
vi.mock("@/modules/leave/repository", () => ({
  listLeaveTypes: mocks.listLeaveTypes,
  listLeaveRequests: mocks.listLeaveRequests,
}));
import { POST as createType } from "@/app/api/v1/leave-types/route";
import { POST as allocate } from "@/app/api/v1/leave-balances/route";
import { POST as requestLeaveRoute } from "@/app/api/v1/leave-requests/route";
import { PATCH as decide } from "@/app/api/v1/leave-requests/[id]/decision/route";
const context = {
  organizationId: "org-a",
  session: { user: { id: "user-a", email: "employee@example.test" } },
} as never;
const req = (url: string, method: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", "x-organization-id": "org-a" },
    body: JSON.stringify(body),
  });
describe("leave API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedContext.mockResolvedValue(context);
    mocks.requirePermission.mockResolvedValue(undefined);
    mocks.createLeaveType.mockResolvedValue({ id: "type-1" });
    mocks.setLeaveBalance.mockResolvedValue({ id: "balance-1" });
    mocks.requestLeave.mockResolvedValue({ id: "leave-1", status: "PENDING" });
    mocks.decideLeave.mockResolvedValue({ id: "leave-1", status: "APPROVED" });
  });
  it("protects leave requests and derives employee identity from the session", async () => {
    mocks.getAuthenticatedContext.mockRejectedValueOnce(unauthenticatedError());
    expect(
      (
        await requestLeaveRoute(
          req("/api/v1/leave-requests", "POST", {
            leaveTypeId: "type-1",
            startDate: "2026-08-20",
            endDate: "2026-08-20",
            reason: "Sick",
          }),
        )
      ).status,
    ).toBe(401);
    mocks.getAuthenticatedContext.mockResolvedValue(context);
    expect(
      (
        await requestLeaveRoute(
          req("/api/v1/leave-requests", "POST", {
            leaveTypeId: "type-1",
            startDate: "2026-08-20",
            endDate: "2026-08-20",
            reason: "Sick",
          }),
        )
      ).status,
    ).toBe(201);
    expect(mocks.requestLeave).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-a", userEmail: "employee@example.test" }),
    );
  });
  it("validates leave dates and half-day duration", async () => {
    expect(
      (
        await requestLeaveRoute(
          req("/api/v1/leave-requests", "POST", {
            leaveTypeId: "type-1",
            startDate: "2026-08-21",
            endDate: "2026-08-20",
            reason: "Invalid",
          }),
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await requestLeaveRoute(
          req("/api/v1/leave-requests", "POST", {
            leaveTypeId: "type-1",
            startDate: "2026-08-20",
            endDate: "2026-08-21",
            durationType: "HALF_DAY",
            reason: "Invalid",
          }),
        )
      ).status,
    ).toBe(422);
  });
  it("validates leave type and balance administration", async () => {
    expect(
      (await createType(req("/api/v1/leave-types", "POST", { name: "Annual", code: "bad code" })))
        .status,
    ).toBe(422);
    expect(
      (
        await createType(
          req("/api/v1/leave-types", "POST", {
            name: "Annual",
            code: "ANNUAL",
            allocationDays: 12,
          }),
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await allocate(
          req("/api/v1/leave-balances", "POST", {
            employeeId: "employee-1",
            leaveTypeId: "type-1",
            periodYear: 2026,
            allocatedDays: 12,
          }),
        )
      ).status,
    ).toBe(201);
  });
  it("requires a rejection reason and approval permission", async () => {
    expect(
      (
        await decide(
          req("/api/v1/leave-requests/leave-1/decision", "PATCH", { decision: "REJECTED" }),
          { params: Promise.resolve({ id: "leave-1" }) },
        )
      ).status,
    ).toBe(422);
    mocks.requirePermission.mockRejectedValueOnce(forbiddenError());
    expect(
      (
        await decide(
          req("/api/v1/leave-requests/leave-1/decision", "PATCH", { decision: "APPROVED" }),
          { params: Promise.resolve({ id: "leave-1" }) },
        )
      ).status,
    ).toBe(403);
  });
});
