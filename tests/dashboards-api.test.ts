import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forbiddenError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  getAuthenticatedContext: vi.fn(),
  requirePermissions: vi.fn(),
  recruitmentDashboard: vi.fn(),
  hrDashboard: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getAuthenticatedContext: mocks.getAuthenticatedContext }));
vi.mock("@/lib/rbac", () => ({ requirePermissions: mocks.requirePermissions }));
vi.mock("@/modules/dashboards/service", () => ({
  recruitmentDashboard: mocks.recruitmentDashboard,
  hrDashboard: mocks.hrDashboard,
}));

import { GET as recruitmentGet } from "@/app/api/v1/dashboards/recruitment/route";
import { GET as hrGet } from "@/app/api/v1/dashboards/hr/route";

const context = {
  session: { user: { id: "user-a", email: "hr@example.test" } },
  organizationId: "org-a",
  membership: { id: "membership-a", status: "ACTIVE" },
};

function request(path: string, organizationId = "org-a") {
  return new NextRequest(`http://localhost${path}`, {
    headers: { "x-organization-id": organizationId },
  });
}

describe("dashboard API RBAC and tenant contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedContext.mockResolvedValue(context);
    mocks.requirePermissions.mockResolvedValue(undefined);
    mocks.recruitmentDashboard.mockResolvedValue({ applications: 1 });
    mocks.hrDashboard.mockResolvedValue({ overview: { applications: 1 } });
  });

  it("passes the active tenant and range to recruitment aggregation", async () => {
    const response = await recruitmentGet(
      request("/api/v1/dashboards/recruitment?from=2026-01-01&to=2026-01-31"),
    );
    expect(response.status).toBe(200);
    expect(mocks.requirePermissions).toHaveBeenCalledWith(
      "user-a",
      "org-a",
      expect.arrayContaining(["dashboard.recruitment.read", "candidates.read"]),
    );
    expect(mocks.recruitmentDashboard).toHaveBeenCalledWith("org-a", {
      from: "2026-01-01",
      to: "2026-01-31",
    });
  });

  it("requires HR dashboard and action-center permissions", async () => {
    expect((await hrGet(request("/api/v1/dashboards/hr"))).status).toBe(200);
    expect(mocks.requirePermissions).toHaveBeenCalledWith(
      "user-a",
      "org-a",
      expect.arrayContaining(["dashboard.hr.read", "notifications.read", "tasks.read"]),
    );
    expect(mocks.hrDashboard).toHaveBeenCalledWith("org-a", "user-a", {});
  });

  it("returns 403 when dashboard permission is absent", async () => {
    mocks.requirePermissions.mockRejectedValue(forbiddenError());
    expect((await recruitmentGet(request("/api/v1/dashboards/recruitment"))).status).toBe(403);
    expect(mocks.recruitmentDashboard).not.toHaveBeenCalled();
  });

  it("rejects a tenant outside the authenticated membership", async () => {
    mocks.getAuthenticatedContext.mockRejectedValue(forbiddenError());
    expect((await hrGet(request("/api/v1/dashboards/hr", "org-b"))).status).toBe(403);
    expect(mocks.requirePermissions).not.toHaveBeenCalled();
    expect(mocks.hrDashboard).not.toHaveBeenCalled();
  });
});
