import { test, expect } from "@playwright/test";

const fixture = {
  email: process.env.E2E_EMAIL,
  password: process.env.E2E_PASSWORD,
  organizationId: process.env.E2E_ORGANIZATION_ID,
  candidateId: process.env.E2E_CANDIDATE_ID,
  applicationId: process.env.E2E_APPLICATION_ID,
  interviewerId: process.env.E2E_INTERVIEWER_ID,
};

test("persists the interview workflow through scorecard and history", async ({ page }) => {
  test.skip(Object.values(fixture).some((value) => !value), "Set E2E_EMAIL, E2E_PASSWORD, E2E_ORGANIZATION_ID, E2E_CANDIDATE_ID, E2E_APPLICATION_ID and E2E_INTERVIEWER_ID for the real PostgreSQL workflow");
  const signIn = await page.request.post("/api/auth/sign-in/email", { data: { email: fixture.email, password: fixture.password } });
  expect(signIn.ok()).toBeTruthy();
  const headers = { "content-type": "application/json", "x-organization-id": fixture.organizationId! };
  const templateResponse = await page.request.post("/api/v1/interview-templates", { headers, data: { name: `E2E template ${Date.now()}`, questions: [{ id: "communication", prompt: "Communication", competency: "Communication", scoringGuidance: "Rate consistently" }] } });
  expect(templateResponse.status()).toBe(201);
  const template = (await templateResponse.json()).data;
  const start = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const createResponse = await page.request.post("/api/v1/interviews", { headers, data: { candidateId: fixture.candidateId, applicationId: fixture.applicationId, participantIds: [fixture.interviewerId], templateId: template.id, round: 1, scheduledStart: start.toISOString(), scheduledEnd: end.toISOString(), timezone: "UTC", mode: "VIDEO" } });
  expect(createResponse.status()).toBe(201);
  const interview = (await createResponse.json()).data;
  expect(interview.template.id).toBe(template.id);
  expect(interview.applicationId).toBe(fixture.applicationId);
  expect((await page.request.post(`/api/v1/interviews/${interview.id}/check-in`, { headers, data: {} })).status()).toBe(200);
  const evaluationResponse = await page.request.post(`/api/v1/interviews/${interview.id}/evaluations`, { headers, data: { scores: { communication: 4 }, comments: "Persisted E2E evaluation", recommendation: "HOLD" } });
  expect(evaluationResponse.status()).toBe(201);
  expect((await page.request.post(`/api/v1/interviews/${interview.id}/check-out`, { headers, data: {} })).status()).toBe(200);
  const detailResponse = await page.request.get(`/api/v1/interviews/${interview.id}`, { headers: { "x-organization-id": fixture.organizationId! } });
  expect(detailResponse.ok()).toBeTruthy();
  const detail = (await detailResponse.json()).data;
  expect(detail.evaluations[0].scores.communication).toBe(4);
  expect(detail.activities.some((activity: { action: string }) => activity.action === "INTERVIEW_EVALUATION_SUBMITTED")).toBeTruthy();
});
