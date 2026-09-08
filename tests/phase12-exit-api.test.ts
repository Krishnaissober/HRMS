import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forbiddenError, unauthenticatedError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  permission: vi.fn(),
  permissions: vi.fn(),
  hasPermission: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  complete: vi.fn(),
}));
vi.mock("@/lib/tenant", () => ({ getAuthenticatedContext: mocks.context }));
vi.mock("@/lib/rbac", () => ({
  requirePermission: mocks.permission,
  requirePermissions: mocks.permissions,
  hasPermission: mocks.hasPermission,
}));
vi.mock("@/modules/employees/service", () => ({
  createExitCase: mocks.create,
  listExitCases: mocks.list,
  completeExitCase: mocks.complete,
}));
import { POST as createRoute } from "@/app/api/v1/employees/[id]/exit/route";
import { GET as listRoute } from "@/app/api/v1/exit/route";
import { POST as completeRoute } from "@/app/api/v1/exit/[id]/complete/route";

const context = { organizationId: "org-a", session: { user: { id: "user-a" } } } as never;
const request = (url: string, method = "POST", body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", "x-organization-id": "org-a" },
    body: body ? JSON.stringify(body) : undefined,
  });

describe("Phase 12 exit API contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.mockResolvedValue(context);
    mocks.permission.mockResolvedValue(undefined);
    mocks.permissions.mockResolvedValue(undefined);
    mocks.hasPermission.mockResolvedValue(true);
    mocks.create.mockResolvedValue({ id: "exit-1", status: "REQUESTED" });
    mocks.list.mockResolvedValue([]);
    mocks.complete.mockResolvedValue({ id: "exit-1", status: "COMPLETED" });
  });
  it("requires authentication and permission", async () => {
    mocks.context.mockRejectedValueOnce(unauthenticatedError());
    expect(
      (
        await createRoute(request("/api/v1/employees/e-1/exit"), {
          params: Promise.resolve({ id: "e-1" }),
        })
      ).status,
    ).toBe(401);
    mocks.context.mockResolvedValue(context);
    mocks.permission.mockRejectedValueOnce(forbiddenError());
    expect((await listRoute(request("/api/v1/exit", "GET"))).status).toBe(403);
  });
  it("validates reason and forwards tenant/actor context", async () => {
    expect(
      (
        await createRoute(
          request("/api/v1/employees/e-1/exit", "POST", {
            reason: "Resignation",
            noticePeriodDays: 30,
          }),
          { params: Promise.resolve({ id: "e-1" }) },
        )
      ).status,
    ).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        actorUserId: "user-a",
        employeeId: "e-1",
        reason: "Resignation",
      }),
    );
    expect(
      (
        await completeRoute(request("/api/v1/exit/exit-1/complete"), {
          params: Promise.resolve({ id: "exit-1" }),
        })
      ).status,
    ).toBe(200);
  });
  it("rejects missing resignation reason", async () => {
    expect(
      (
        await createRoute(request("/api/v1/employees/e-1/exit", "POST", {}), {
          params: Promise.resolve({ id: "e-1" }),
        })
      ).status,
    ).toBe(422);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects exit initiation without organization-wide or team authority", async () => {
    mocks.hasPermission.mockResolvedValue(false);
    expect(
      (
        await createRoute(
          request("/api/v1/employees/e-1/exit", "POST", { reason: "Resignation" }),
          { params: Promise.resolve({ id: "e-1" }) },
        )
      ).status,
    ).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
