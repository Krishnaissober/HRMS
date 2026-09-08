import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forbiddenError, unauthenticatedError } from "@/lib/errors";

const {
  getAuthenticatedContext,
  requirePermission,
  createInterview,
  updateInterview,
  listInterviews,
} = vi.hoisted(() => ({
  getAuthenticatedContext: vi.fn(),
  requirePermission: vi.fn(),
  createInterview: vi.fn(),
  updateInterview: vi.fn(),
  listInterviews: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getAuthenticatedContext }));
vi.mock("@/lib/rbac", () => ({ requirePermission }));
vi.mock("@/modules/interviews/service", () => ({ createInterview, updateInterview }));
vi.mock("@/modules/interviews/repository", () => ({ listInterviews }));

import { GET, POST } from "@/app/api/v1/interviews/route";
import { PATCH } from "@/app/api/v1/interviews/[id]/route";

const context = { organizationId: "org-a", session: { user: { id: "user-a" } } } as never;
const validBody = {
  candidateId: "candidate-1",
  applicationId: "application-1",
  participantIds: ["user-1"],
  scheduledStart: "2026-08-20T10:00:00.000Z",
  scheduledEnd: "2026-08-20T11:00:00.000Z",
  timezone: "UTC",
  mode: "VIDEO",
};

function request(body?: unknown) {
  return new NextRequest("http://localhost/api/v1/interviews", {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", "x-organization-id": "org-a" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("interview API authorization and validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedContext.mockResolvedValue(context);
    requirePermission.mockResolvedValue(undefined);
    createInterview.mockResolvedValue({ id: "interview-1", organizationId: "org-a" });
    updateInterview.mockResolvedValue({
      id: "interview-1",
      organizationId: "org-a",
      status: "NO_SHOW",
    });
    listInterviews.mockResolvedValue({ items: [], total: 0 });
  });

  it("rejects unauthenticated and unauthorized requests", async () => {
    getAuthenticatedContext.mockRejectedValueOnce(unauthenticatedError());
    expect((await POST(request(validBody))).status).toBe(401);
    getAuthenticatedContext.mockResolvedValue(context);
    requirePermission.mockRejectedValueOnce(forbiddenError());
    expect((await POST(request(validBody))).status).toBe(403);
  });

  it("rejects invalid scheduling and accepts an authorized request", async () => {
    expect(
      (await POST(request({ ...validBody, scheduledEnd: validBody.scheduledStart }))).status,
    ).toBe(422);
    expect((await POST(request(validBody))).status).toBe(201);
    expect(createInterview).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-a", actorUserId: "user-a" }),
    );
  });

  it("keeps list results organization-scoped", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/v1/interviews?q=panel&page=1&pageSize=10", {
        headers: { "x-organization-id": "org-a" },
      }),
    );
    expect(response.status).toBe(200);
    expect(listInterviews).toHaveBeenCalledWith(
      "org-a",
      expect.objectContaining({ q: "panel", page: 1, pageSize: 10 }),
    );
  });

  it("validates and authorizes the no-show transition", async () => {
    const noShowRequest = (body: unknown, organizationId = "org-a") =>
      new NextRequest("http://localhost/api/v1/interviews/interview-1", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-organization-id": organizationId },
        body: JSON.stringify(body),
      });
    expect(
      (
        await PATCH(noShowRequest({ status: "NO_SHOW" }), {
          params: Promise.resolve({ id: "interview-1" }),
        })
      ).status,
    ).toBe(422);
    requirePermission.mockRejectedValueOnce(forbiddenError());
    expect(
      (
        await PATCH(noShowRequest({ status: "NO_SHOW", noShowReason: "Did not attend" }), {
          params: Promise.resolve({ id: "interview-1" }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await PATCH(
          noShowRequest({
            status: "NO_SHOW",
            noShowReason: "Did not attend",
            noShowNotes: "Called twice",
          }),
          { params: Promise.resolve({ id: "interview-1" }) },
        )
      ).status,
    ).toBe(200);
    expect(updateInterview).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        patch: expect.objectContaining({ status: "NO_SHOW", noShowReason: "Did not attend" }),
      }),
    );
  });
});
