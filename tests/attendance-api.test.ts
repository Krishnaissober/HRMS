import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forbiddenError, unauthenticatedError } from "@/lib/errors";

const { getAuthenticatedContext, requirePermission, checkInCandidate, checkOutCandidate, recordAttendanceException, listVisits, registerVisitor } = vi.hoisted(() => ({
  getAuthenticatedContext: vi.fn(), requirePermission: vi.fn(), checkInCandidate: vi.fn(), checkOutCandidate: vi.fn(), recordAttendanceException: vi.fn(), listVisits: vi.fn(), registerVisitor: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getAuthenticatedContext }));
vi.mock("@/lib/rbac", () => ({ requirePermission }));
vi.mock("@/modules/attendance/service", () => ({ checkInCandidate, checkOutCandidate, recordAttendanceException, listVisits, registerVisitor }));

import { POST as checkIn } from "@/app/api/v1/attendance/check-in/route";
import { POST as checkOut } from "@/app/api/v1/attendance/check-out/route";
import { GET as list } from "@/app/api/v1/attendance/route";

const context = { organizationId: "org-a", session: { user: { id: "user-a" } } } as never;
const request = (url: string, body?: unknown) => new NextRequest(`http://localhost${url}`, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", "x-organization-id": "org-a" }, body: body ? JSON.stringify(body) : undefined });

describe("candidate attendance API authorization", () => {
  beforeEach(() => { vi.clearAllMocks(); getAuthenticatedContext.mockResolvedValue(context); requirePermission.mockResolvedValue(undefined); checkInCandidate.mockResolvedValue({ id: "visit-1", organizationId: "org-a", status: "CHECKED_IN" }); checkOutCandidate.mockResolvedValue({ id: "visit-1", organizationId: "org-a", status: "CHECKED_OUT" }); listVisits.mockResolvedValue({ items: [], total: 0 }); });

  it("rejects unauthenticated and unauthorized check-in", async () => {
    getAuthenticatedContext.mockRejectedValueOnce(unauthenticatedError());
    expect((await checkIn(request("/api/v1/attendance/check-in", { candidateId: "candidate-1" }))).status).toBe(401);
    getAuthenticatedContext.mockResolvedValue(context); requirePermission.mockRejectedValueOnce(forbiddenError());
    expect((await checkIn(request("/api/v1/attendance/check-in", { candidateId: "candidate-1" }))).status).toBe(403);
  });

  it("passes tenant context to check-in, check-out and list paths", async () => {
    expect((await checkIn(request("/api/v1/attendance/check-in", { candidateId: "candidate-1" }))).status).toBe(200);
    expect((await checkOut(request("/api/v1/attendance/check-out", { visitId: "visit-1" }))).status).toBe(200);
    expect((await list(request("/api/v1/attendance?page=1&pageSize=10"))).status).toBe(200);
    expect(checkInCandidate).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-a", actorUserId: "user-a" }));
    expect(checkOutCandidate).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-a", actorUserId: "user-a" }));
    expect(listVisits).toHaveBeenCalledWith("org-a", expect.objectContaining({ page: 1, pageSize: 10 }));
  });
});
