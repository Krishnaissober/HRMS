import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forbiddenError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  getAuthenticatedContext: vi.fn(),
  requirePermission: vi.fn(),
  listCandidates: vi.fn(),
  findCandidateMatch: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getAuthenticatedContext: mocks.getAuthenticatedContext }));
vi.mock("@/lib/rbac", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/modules/candidates/repository", () => ({ listCandidates: mocks.listCandidates, findCandidateMatch: mocks.findCandidateMatch }));

import { GET } from "@/app/api/v1/candidates/route";
import { GET as matchGET } from "@/app/api/v1/candidates/match/route";

const context = {
  session: { user: { id: "admin-user", email: "admin@example.test" } },
  organizationId: "org-active",
  membership: { id: "membership-active", status: "ACTIVE" },
};

function request(organizationId = "org-active") {
  return new NextRequest("http://localhost/api/v1/candidates?q=&page=1&pageSize=20", {
    headers: { "x-organization-id": organizationId },
  });
}

describe("candidate list RBAC contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedContext.mockResolvedValue(context);
    mocks.requirePermission.mockResolvedValue(undefined);
    mocks.listCandidates.mockResolvedValue({ items: [], total: 0 });
  });

  it("allows an active administrator with candidates.read", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith("admin-user", "org-active", "candidates.read");
  });

  it("returns 403 when the active role lacks candidates.read", async () => {
    mocks.requirePermission.mockRejectedValue(forbiddenError());
    expect((await GET(request())).status).toBe(403);
  });

  it("rejects a cross-tenant organization before candidate access", async () => {
    mocks.getAuthenticatedContext.mockRejectedValue(forbiddenError());
    expect((await GET(request("org-other"))).status).toBe(403);
    expect(mocks.requirePermission).not.toHaveBeenCalled();
    expect(mocks.listCandidates).not.toHaveBeenCalled();
  });

  it("uses the active organization for permission and repository scope", async () => {
    await GET(request());
    expect(mocks.requirePermission).toHaveBeenCalledWith("admin-user", "org-active", "candidates.read");
    expect(mocks.listCandidates).toHaveBeenCalledWith("org-active", expect.objectContaining({ page: 1, pageSize: 20 }));
  });

  it("matches a walk-in candidate only within the active organization", async () => {
    mocks.findCandidateMatch.mockResolvedValue({ id: "candidate-1", referenceNo: "TM-CAN-001", firstName: "Asha" });
    const response = await matchGET(new NextRequest("http://localhost/api/v1/candidates/match?identifier=%2B91%209999999999"));
    expect(response.status).toBe(200);
    expect(mocks.findCandidateMatch).toHaveBeenCalledWith("org-active", "+91 9999999999");
  });

  it("rejects candidate matching when the authenticated tenant is forbidden", async () => {
    mocks.getAuthenticatedContext.mockRejectedValue(forbiddenError());
    expect((await matchGET(new NextRequest("http://localhost/api/v1/candidates/match?identifier=asha%40example.test"))).status).toBe(403);
    expect(mocks.findCandidateMatch).not.toHaveBeenCalled();
  });
});
