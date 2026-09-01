import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forbiddenError } from "@/lib/errors";
import { calculateAmounts } from "@/modules/payroll/service";
const m = vi.hoisted(() => ({
  context: vi.fn(),
  permission: vi.fn(),
  list: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/lib/tenant", () => ({ getAuthenticatedContext: m.context }));
vi.mock("@/lib/rbac", () => ({ requirePermission: m.permission }));
vi.mock("@/modules/payroll/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/payroll/service")>()),
  listSalary: m.list,
  saveSalary: m.save,
}));
import { GET, POST } from "@/app/api/v1/salary-structures/route";
const ctx = {
  session: { user: { id: "user-a", email: "a@example.test" } },
  organizationId: "org-a",
  membership: { status: "ACTIVE" },
};
const req = (method = "GET", body?: unknown) =>
  new NextRequest("http://localhost/api/v1/salary-structures", {
    method,
    headers: { "content-type": "application/json", "x-organization-id": "org-a" },
    body: body ? JSON.stringify(body) : undefined,
  });
describe("Phase 9 payroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.context.mockResolvedValue(ctx);
    m.permission.mockResolvedValue(undefined);
    m.list.mockResolvedValue([]);
    m.save.mockResolvedValue({ id: "salary-1" });
  });
  it("calculates configured components", () =>
    expect(
      calculateAmounts(1000, [
        { name: "Allowance", type: "ALLOWANCE", amount: 100 },
        { name: "Tax", type: "DEDUCTION", amount: 50 },
      ]),
    ).toEqual({ gross: 1100, deductions: 50, net: 1050 }));
  it("requires salary permissions and tenant context", async () => {
    expect((await GET(req())).status).toBe(200);
    expect(m.permission).toHaveBeenCalledWith("user-a", "org-a", "salary.read");
    m.permission.mockRejectedValueOnce(forbiddenError());
    expect((await GET(req())).status).toBe(403);
  });
  it("validates salary writes", async () => {
    expect(
      (
        await POST(
          req("POST", {
            employeeId: "employee-1",
            currency: "USD",
            basicSalary: 1000,
            components: [],
          }),
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await POST(
          req("POST", {
            employeeId: "employee-1",
            currency: "usd",
            basicSalary: -1,
            components: [],
          }),
        )
      ).status,
    ).toBe(422);
  });
});
