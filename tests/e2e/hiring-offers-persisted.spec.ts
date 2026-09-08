import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";

test("persists hiring decision, approved offer, response, PDF and tenant boundaries", async ({
  page,
  request,
}) => {
  const organizationId = process.env.E2E_ORGANIZATION_ID!;
  const otherOrganizationId = process.env.E2E_OTHER_ORGANIZATION_ID!;
  const applicationId = process.env.E2E_APPLICATION_ID!;
  const headers = { "content-type": "application/json", "x-organization-id": organizationId };
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
      })
    ).ok(),
  ).toBeTruthy();

  const missingReason = await page.request.post("/api/v1/hiring-decisions", {
    headers,
    data: { applicationId, decision: "HOLD" },
  });
  expect(missingReason.status()).toBe(422);

  const decisionResponse = await page.request.post("/api/v1/hiring-decisions", {
    headers,
    data: { applicationId, decision: "HIRE", notes: "Interview and attendance completed" },
  });
  expect(decisionResponse.status()).toBe(201);
  const decision = (await decisionResponse.json()).data;
  expect(decision.decision).toBe("HIRE");
  const invalidHold = await page.request.post("/api/v1/hiring-decisions", {
    headers,
    data: { applicationId, decision: "HOLD", reason: "Attempted invalid reversal" },
  });
  expect(invalidHold.status()).toBe(409);
  const invalidReject = await page.request.post("/api/v1/hiring-decisions", {
    headers,
    data: { applicationId, decision: "REJECT", reason: "Attempted invalid reversal" },
  });
  expect(invalidReject.status()).toBe(409);

  const wrongTenantDecision = await page.request.get(
    `/api/v1/hiring-decisions?applicationId=${applicationId}`,
    { headers: { "x-organization-id": otherOrganizationId } },
  );
  expect(wrongTenantDecision.status()).toBe(200);
  expect((await wrongTenantDecision.json()).data).toHaveLength(0);

  const templateResponse = await page.request.post("/api/v1/offer-templates", {
    headers,
    data: {
      name: `E2E Offer ${Date.now()}`,
      body: "We are pleased to offer you the position described above.",
      approvalRequired: true,
      approvalSteps: ["HR approval"],
    },
  });
  expect(templateResponse.status()).toBe(201);
  const template = (await templateResponse.json()).data;
  const offerResponse = await page.request.post("/api/v1/offers", {
    headers,
    data: {
      applicationId,
      hiringDecisionId: decision.id,
      templateId: template.id,
      compensationSummary: "As approved in the requisition",
    },
  });
  expect(offerResponse.status()).toBe(201);
  const offer = (await offerResponse.json()).data;
  expect(offer.status).toBe("PENDING_APPROVAL");
  const duplicateOffer = await page.request.post("/api/v1/offers", {
    headers,
    data: { applicationId, hiringDecisionId: decision.id, templateId: template.id },
  });
  expect(duplicateOffer.status()).toBe(409);
  const sendBeforeApproval = await page.request.post(`/api/v1/offers/${offer.id}/send`, {
    headers,
    data: {},
  });
  expect(sendBeforeApproval.status()).toBe(422);

  const approveResponse = await page.request.post(`/api/v1/offers/${offer.id}/approve`, {
    headers,
    data: { comments: "Approved for dispatch" },
  });
  expect(approveResponse.ok()).toBeTruthy();
  expect((await approveResponse.json()).data.status).toBe("APPROVED");
  const sendResponse = await page.request.post(`/api/v1/offers/${offer.id}/send`, {
    headers,
    data: {},
  });
  expect(sendResponse.ok()).toBeTruthy();
  const sent = (await sendResponse.json()).data;
  expect(sent.offer.status).toBe("SENT");
  const token = new URL(sent.responseUrl).searchParams.get("token");
  expect(token).toBeTruthy();

  const downloadResponse = await page.request.get(`/api/v1/offers/${offer.id}/download`, {
    headers: { "x-organization-id": organizationId },
  });
  expect(downloadResponse.ok()).toBeTruthy();
  expect(downloadResponse.headers()["content-type"]).toContain("application/pdf");
  const crossTenantDownload = await page.request.get(`/api/v1/offers/${offer.id}/download`, {
    headers: { "x-organization-id": otherOrganizationId },
  });
  expect(crossTenantDownload.status()).toBe(404);
  const crossTenantApproval = await page.request.post(`/api/v1/offers/${offer.id}/approve`, {
    headers: { ...headers, "x-organization-id": otherOrganizationId },
    data: {},
  });
  expect(crossTenantApproval.status()).toBe(404);
  const unauthenticatedDownload = await request.get(`/api/v1/offers/${offer.id}/download`, {
    headers: { "x-organization-id": organizationId },
  });
  expect(unauthenticatedDownload.status()).toBe(401);

  const response = await page.request.post("/api/v1/public/offers/respond", {
    data: { token, response: "ACCEPTED", notes: "I accept the offer" },
  });
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).data.status).toBe("ACCEPTED");
  const replay = await page.request.post("/api/v1/public/offers/respond", {
    data: { token, response: "DECLINED" },
  });
  expect(replay.status()).toBe(404);

  const auditActions = await db.auditLog.findMany({
    where: { organizationId, entityType: "Offer", entityId: offer.id },
    select: { action: true },
  });
  expect(auditActions.map((item) => item.action)).toEqual(
    expect.arrayContaining([
      "OFFER_CREATED",
      "OFFER_APPROVED",
      "OFFER_SENT",
      "OFFER_DOWNLOADED",
      "OFFER_ACCEPTED",
    ]),
  );
  const persisted = await db.offer.findUnique({
    where: { id: offer.id },
    include: { approvals: true },
  });
  expect(persisted?.status).toBe("ACCEPTED");
  expect(persisted?.approvals[0]?.status).toBe("APPROVED");
});

test("persists valid hold/reject decisions and rejects concurrent duplicate offers", async ({
  page,
}) => {
  const organizationId = process.env.E2E_ORGANIZATION_ID!;
  const headers = { "content-type": "application/json", "x-organization-id": organizationId };
  const requisition = await db.jobRequisition.findFirstOrThrow({ where: { organizationId } });
  async function createCandidate(suffix: string) {
    const candidate = await db.candidate.create({
      data: {
        organizationId,
        referenceNo: `CAND-REMED-${Date.now()}-${suffix}`,
        firstName: "Remediation",
        lastName: suffix,
        email: `remediation-${Date.now()}-${suffix}@example.test`,
        phone: `911${String(Date.now()).slice(-7)}`,
        roleOfInterest: requisition.title,
        source: "WALK_IN",
        status: "INTERVIEW",
        declarationAccepted: true,
        consentAccepted: true,
      },
    });
    const application = await db.application.create({
      data: {
        organizationId,
        referenceNo: `APP-REMED-${Date.now()}-${suffix}`,
        candidateId: candidate.id,
        requisitionId: requisition.id,
        status: "INTERVIEW",
      },
    });
    await db.interview.create({
      data: {
        organizationId,
        referenceNo: `INT-REMED-${Date.now()}-${suffix}`,
        candidateId: candidate.id,
        applicationId: application.id,
        scheduledStart: new Date("2026-01-15T10:00:00Z"),
        scheduledEnd: new Date("2026-01-15T11:00:00Z"),
        timezone: "UTC",
        mode: "VIDEO",
        meetingLink: "https://meet.example.test/e2e",
        status: "COMPLETED",
        createdByUserId: process.env.E2E_INTERVIEWER_ID!,
      },
    });
    return application;
  }
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
      })
    ).ok(),
  ).toBeTruthy();
  const holdApplication = await createCandidate("HOLD");
  const hold = await page.request.post("/api/v1/hiring-decisions", {
    headers,
    data: {
      applicationId: holdApplication.id,
      decision: "HOLD",
      reason: "Needs additional approval",
    },
  });
  expect(hold.status()).toBe(201);
  const reject = await page.request.post("/api/v1/hiring-decisions", {
    headers,
    data: {
      applicationId: holdApplication.id,
      decision: "REJECT",
      reason: "Rejected after hold review",
    },
  });
  expect(reject.status()).toBe(201);
  const raceApplication = await createCandidate("RACE");
  const raceDecisionResponse = await page.request.post("/api/v1/hiring-decisions", {
    headers,
    data: { applicationId: raceApplication.id, decision: "HIRE" },
  });
  const raceDecision = (await raceDecisionResponse.json()).data;
  const templateResponse = await page.request.post("/api/v1/offer-templates", {
    headers,
    data: {
      name: `Race ${Date.now()}`,
      body: "Race offer",
      approvalRequired: false,
      approvalSteps: [],
    },
  });
  const template = (await templateResponse.json()).data;
  const createPayload = {
    applicationId: raceApplication.id,
    hiringDecisionId: raceDecision.id,
    templateId: template.id,
  };
  const results = await Promise.all([
    page.request.post("/api/v1/offers", { headers, data: createPayload }),
    page.request.post("/api/v1/offers", { headers, data: createPayload }),
  ]);
  expect(results.map((result) => result.status()).sort()).toEqual([201, 409]);
  const persistedOffers = await db.offer.count({
    where: { organizationId, hiringDecisionId: raceDecision.id },
  });
  expect(persistedOffers).toBe(1);
});
