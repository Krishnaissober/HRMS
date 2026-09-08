import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forbiddenError, unauthenticatedError } from "@/lib/errors";

const {
  getAuthenticatedContext,
  requirePermission,
  createHiringDecision,
  listHiringDecisions,
  createOffer,
  sendOffer,
} = vi.hoisted(() => ({
  getAuthenticatedContext: vi.fn(),
  requirePermission: vi.fn(),
  createHiringDecision: vi.fn(),
  listHiringDecisions: vi.fn(),
  createOffer: vi.fn(),
  sendOffer: vi.fn(),
}));
vi.mock("@/lib/tenant", () => ({ getAuthenticatedContext }));
vi.mock("@/lib/rbac", () => ({ requirePermission }));
vi.mock("@/modules/hiring/service", () => ({ createHiringDecision, createOffer, sendOffer }));
vi.mock("@/modules/hiring/repository", () => ({ listHiringDecisions }));

import { GET, POST } from "@/app/api/v1/hiring-decisions/route";
import { POST as createOfferRoute } from "@/app/api/v1/offers/route";
import { POST as sendOfferRoute } from "@/app/api/v1/offers/[id]/send/route";

const context = { organizationId: "org-a", session: { user: { id: "user-a" } } } as never;
function request(body?: unknown) {
  return new NextRequest("http://localhost/api/v1/hiring-decisions", {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", "x-organization-id": "org-a" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("hiring decision and offer API authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedContext.mockResolvedValue(context);
    requirePermission.mockResolvedValue(undefined);
    createHiringDecision.mockResolvedValue({ id: "decision-1", decision: "HIRE" });
    createOffer.mockResolvedValue({ id: "offer-1", status: "PENDING_APPROVAL" });
    sendOffer.mockResolvedValue({
      offer: { id: "offer-1", status: "SENT" },
      delivery: { status: "FAILED" },
      deliveryStatus: "FAILED",
    });
    listHiringDecisions.mockResolvedValue([]);
  });
  it("enforces authentication and permissions", async () => {
    getAuthenticatedContext.mockRejectedValueOnce(unauthenticatedError());
    expect((await POST(request({ applicationId: "app-1", decision: "HIRE" }))).status).toBe(401);
    getAuthenticatedContext.mockResolvedValue(context);
    requirePermission.mockRejectedValueOnce(forbiddenError());
    expect((await POST(request({ applicationId: "app-1", decision: "HIRE" }))).status).toBe(403);
  });
  it("requires reasons for hold and reject at the request boundary", async () => {
    expect((await POST(request({ applicationId: "app-1", decision: "HOLD" }))).status).toBe(422);
    expect(
      (await POST(request({ applicationId: "app-1", decision: "REJECT", reason: "Not suitable" })))
        .status,
    ).toBe(201);
    expect(createHiringDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        actorUserId: "user-a",
        decision: "REJECT",
      }),
    );
  });
  it("keeps decision reads organization-scoped", async () => {
    expect((await GET(request())).status).toBe(200);
    expect(listHiringDecisions).toHaveBeenCalledWith("org-a", undefined);
  });
  it("requires authenticated offer creation and forwards tenant context", async () => {
    const offerRequest = new NextRequest("http://localhost/api/v1/offers", {
      method: "POST",
      headers: { "content-type": "application/json", "x-organization-id": "org-a" },
      body: JSON.stringify({
        applicationId: "app-1",
        hiringDecisionId: "decision-1",
        templateId: "template-1",
      }),
    });
    expect((await createOfferRoute(offerRequest)).status).toBe(201);
    expect(createOffer).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-a", actorUserId: "user-a" }),
    );
  });
  it("returns committed delivery failure state without claiming delivery success", async () => {
    const sendRequest = new NextRequest("http://localhost/api/v1/offers/offer-1/send", {
      method: "POST",
      headers: { "content-type": "application/json", "x-organization-id": "org-a" },
      body: "{}",
    });
    const response = await sendOfferRoute(sendRequest, {
      params: Promise.resolve({ id: "offer-1" }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).data.deliveryStatus).toBe("FAILED");
    expect(sendOffer).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-a", actorUserId: "user-a", id: "offer-1" }),
    );
  });
  it("rejects unauthorized offer sends", async () => {
    requirePermission.mockRejectedValueOnce(forbiddenError());
    const sendRequest = new NextRequest("http://localhost/api/v1/offers/offer-1/send", {
      method: "POST",
      headers: { "content-type": "application/json", "x-organization-id": "org-a" },
      body: "{}",
    });
    expect(
      (await sendOfferRoute(sendRequest, { params: Promise.resolve({ id: "offer-1" }) })).status,
    ).toBe(403);
  });
});
