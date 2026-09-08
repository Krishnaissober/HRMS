import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forbiddenError, unauthenticatedError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  getAuthenticatedContext: vi.fn(),
  requirePermissions: vi.fn(),
  analyticsForDomain: vi.fn(),
  analyticsCsv: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getAuthenticatedContext: mocks.getAuthenticatedContext }));
vi.mock("@/lib/rbac", () => ({ requirePermissions: mocks.requirePermissions }));
vi.mock("@/lib/audit", () => ({ recordAuditEvent: mocks.recordAuditEvent }));
vi.mock("@/modules/analytics/service", () => ({
  analyticsForDomain: mocks.analyticsForDomain,
  analyticsCsv: mocks.analyticsCsv,
}));

import { GET as analyticsGet } from "@/app/api/v1/analytics/[domain]/route";
import { GET as exportGet } from "@/app/api/v1/reports/[domain]/export/route";

const context = {
  session: { user: { id: "user-a" } },
  organizationId: "org-a",
  membership: { status: "ACTIVE" },
};
const params = (domain: string) => ({ params: Promise.resolve({ domain }) });
const request = (path: string, organizationId = "org-a") =>
  new NextRequest(`http://localhost${path}`, { headers: { "x-organization-id": organizationId } });

describe("Phase 11 analytics API contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedContext.mockResolvedValue(context);
    mocks.requirePermissions.mockResolvedValue(undefined);
    mocks.analyticsForDomain.mockResolvedValue({ domain: "workforce", headcount: 2 });
    mocks.analyticsCsv.mockReturnValue("metric,value\r\nheadcount,2");
    mocks.recordAuditEvent.mockResolvedValue({ id: "audit-a" });
  });

  it("passes the authenticated tenant and validated filters to aggregation", async () => {
    const response = await analyticsGet(
      request("/api/v1/analytics/workforce?from=2026-01-01&department=People"),
      params("workforce"),
    );
    expect(response.status).toBe(200);
    expect(mocks.requirePermissions).toHaveBeenCalledWith("user-a", "org-a", ["employees.read"]);
    expect(mocks.analyticsForDomain).toHaveBeenCalledWith(
      "workforce",
      "org-a",
      { from: "2026-01-01", department: "People" },
      { userId: "user-a", email: undefined },
    );
  });

  it("rejects unauthenticated, unauthorized, cross-tenant, and invalid-filter requests", async () => {
    mocks.getAuthenticatedContext.mockRejectedValueOnce(unauthenticatedError());
    expect((await analyticsGet(request("/api/v1/analytics/leave"), params("leave"))).status).toBe(
      401,
    );
    mocks.getAuthenticatedContext.mockResolvedValueOnce(context);
    mocks.requirePermissions.mockRejectedValueOnce(forbiddenError());
    expect((await analyticsGet(request("/api/v1/analytics/leave"), params("leave"))).status).toBe(
      403,
    );
    mocks.getAuthenticatedContext.mockRejectedValueOnce(forbiddenError());
    expect(
      (await analyticsGet(request("/api/v1/analytics/leave", "org-b"), params("leave"))).status,
    ).toBe(403);
    mocks.getAuthenticatedContext.mockResolvedValueOnce(context);
    expect(
      (
        await analyticsGet(
          request("/api/v1/analytics/leave?from=2026-02-01&to=2026-01-01"),
          params("leave"),
        )
      ).status,
    ).toBe(422);
  });

  it("requires distinct export permission and audits the filtered CSV export", async () => {
    const response = await exportGet(
      request("/api/v1/reports/payroll/export?from=2026-01-01"),
      params("payroll"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(mocks.requirePermissions).toHaveBeenCalledWith("user-a", "org-a", [
      "payroll.reports",
      "reports.export",
    ]);
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        actorUserId: "user-a",
        action: "REPORT_EXPORTED",
        entityId: "payroll",
        metadata: { domain: "payroll", filters: { from: "2026-01-01" }, format: "CSV" },
      }),
    );
  });

  it("does not generate or audit an export when export authorization fails", async () => {
    mocks.requirePermissions.mockRejectedValue(forbiddenError());
    const response = await exportGet(
      request("/api/v1/reports/workforce/export"),
      params("workforce"),
    );
    expect(response.status).toBe(403);
    expect(mocks.analyticsForDomain).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });
});
