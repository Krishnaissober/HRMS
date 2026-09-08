import { beforeEach, describe, expect, it, vi } from "vitest";
import { forbiddenError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({ membership: vi.fn(), employee: vi.fn(), reports: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    membership: { findUnique: mocks.membership },
    employee: { findFirst: mocks.employee, findMany: mocks.reports },
  },
}));

import { resolveAnalyticsScope, scopedEmployeeWhere } from "@/modules/analytics/service";

describe("Phase 11 actor data scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("limits a manager to direct reports and rejects an out-of-scope employee", async () => {
    mocks.membership.mockResolvedValue({ roles: [{ role: { slug: "manager", name: "Manager" } }] });
    mocks.employee.mockResolvedValue({ id: "manager-employee" });
    mocks.reports.mockResolvedValue([{ id: "report-a" }, { id: "report-b" }]);
    const scope = await resolveAnalyticsScope("org-a", {
      userId: "manager-user",
      email: "manager@example.test",
    });
    expect(scope).toEqual({ employeeIds: ["report-a", "report-b"] });
    expect(scopedEmployeeWhere({ employeeId: "report-a" }, scope)).toEqual({ id: "report-a" });
    expect(() => scopedEmployeeWhere({ employeeId: "outside" }, scope)).toThrow(
      forbiddenError().message,
    );
  });

  it("fails closed for a recruiter when no persisted requisition assignment exists", async () => {
    mocks.membership.mockResolvedValue({
      roles: [{ role: { slug: "recruiter", name: "Recruiter" } }],
    });
    expect(
      await resolveAnalyticsScope("org-a", {
        userId: "recruiter-user",
        email: "recruiter@example.test",
      }),
    ).toEqual({ recruiterRestricted: true });
  });

  it("does not constrain established HR roles", async () => {
    mocks.membership.mockResolvedValue({
      roles: [{ role: { slug: "hr-manager", name: "HR Manager" } }],
    });
    expect(
      await resolveAnalyticsScope("org-a", { userId: "hr-user", email: "hr@example.test" }),
    ).toEqual({});
  });
});
