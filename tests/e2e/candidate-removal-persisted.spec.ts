import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

test.afterAll(async () => {
  await db.$disconnect();
});

test("removes selected candidates from both selected and onboarding queues", async ({ page }) => {
  const organizationId = process.env.E2E_ORGANIZATION_ID!;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const requisition = await db.jobRequisition.create({
    data: {
      organizationId,
      referenceNo: `REQ-REMOVE-${suffix}`,
      title: "Candidate Removal Role",
      status: "PUBLISHED",
      approvedAt: new Date(),
      openedAt: new Date(),
    },
  });

  async function selectedCandidate(label: string) {
    const candidate = await db.candidate.create({
      data: {
        organizationId,
        referenceNo: `CAND-REMOVE-${label}-${suffix}`,
        firstName: "Remove",
        lastName: label,
        email: `remove-${label.toLowerCase()}-${suffix}@example.test`,
        phone: `92${String(Date.now()).slice(-8)}`,
        roleOfInterest: requisition.title,
        source: "WALK_IN",
        declarationAccepted: true,
        consentAccepted: true,
        status: "SELECTED",
        hiringApprovalStatus: "FINAL_HIRED",
      },
    });
    await db.application.create({
      data: {
        organizationId,
        referenceNo: `APP-REMOVE-${label}-${suffix}`,
        candidateId: candidate.id,
        requisitionId: requisition.id,
        status: "SELECTED",
      },
    });
    return candidate;
  }

  const selected = await selectedCandidate("Selected");
  const onboarding = await selectedCandidate("Onboarding");

  const login = await page.request.post("/api/auth/sign-in/email", {
    data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
  });
  expect(login.ok()).toBeTruthy();

  const dashboardBeforeResponse = await page.request.get("/api/v1/dashboards/hr");
  expect(dashboardBeforeResponse.ok()).toBeTruthy();
  const dashboardBefore = (await dashboardBeforeResponse.json()).data;

  await page.goto("/hr/employees");
  const selectedRow = page
    .getByText(selected.referenceNo)
    .locator("xpath=ancestor::*[.//button[normalize-space()='Remove candidate']][1]");
  await selectedRow.getByRole("button", { name: "Remove candidate" }).click();
  const selectedDialog = page.getByRole("dialog");
  const dialogBounds = await selectedDialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBounds?.x).toBe(0);
  expect(dialogBounds?.y).toBe(0);
  expect(dialogBounds?.width).toBe(viewport?.width);
  expect(dialogBounds?.height).toBe(viewport?.height);
  expect(
    await selectedDialog.evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe("rgb(11, 16, 24)");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await selectedDialog
    .getByPlaceholder("Record why this candidate is being removed")
    .fill("Candidate withdrew");
  await selectedDialog.getByRole("button", { name: "Remove candidate" }).click();
  await expect(page.getByText(selected.referenceNo)).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

  await page.goto("/hr/onboarding");
  const onboardingRow = page
    .getByText(onboarding.referenceNo)
    .locator("xpath=ancestor::*[.//button[normalize-space()='Remove candidate']][1]");
  await onboardingRow.getByRole("button", { name: "Remove candidate" }).click();
  const onboardingDialog = page.getByRole("dialog");
  await onboardingDialog
    .getByPlaceholder("Record why this candidate is being removed")
    .fill("Role was cancelled");
  await onboardingDialog.getByRole("button", { name: "Remove candidate" }).click();
  await expect(page.getByText(onboarding.referenceNo)).toHaveCount(0);

  const removed = await db.candidate.findMany({
    where: { id: { in: [selected.id, onboarding.id] } },
    select: { status: true, hiringApprovalStatus: true },
  });
  expect(removed).toHaveLength(2);
  expect(removed.every((candidate) => candidate.status === "REJECTED")).toBeTruthy();
  expect(
    removed.every((candidate) => candidate.hiringApprovalStatus === "FINAL_REJECTED"),
  ).toBeTruthy();

  const dashboardAfterResponse = await page.request.get("/api/v1/dashboards/hr");
  expect(dashboardAfterResponse.ok()).toBeTruthy();
  const dashboardAfter = (await dashboardAfterResponse.json()).data;
  expect(dashboardAfter.overview.applications).toBe(dashboardBefore.overview.applications - 2);
});

test("selects and bulk removes applicants from the candidate table", async ({ page }) => {
  const organizationId = process.env.E2E_ORGANIZATION_ID!;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const requisition = await db.jobRequisition.create({
    data: {
      organizationId,
      referenceNo: `REQ-BULK-REMOVE-${suffix}`,
      title: "Bulk Removal Role",
      status: "PUBLISHED",
      approvedAt: new Date(),
      openedAt: new Date(),
    },
  });

  async function applicant(label: string) {
    const candidate = await db.candidate.create({
      data: {
        organizationId,
        referenceNo: `CAND-BULK-${label}-${suffix}`,
        firstName: "Bulk",
        lastName: `${label}-${suffix}`,
        email: `bulk-${label.toLowerCase()}-${suffix}@example.test`,
        phone: `93${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`,
        roleOfInterest: requisition.title,
        source: "ONLINE",
        declarationAccepted: true,
        consentAccepted: true,
        status: "APPLIED",
      },
    });
    await db.application.create({
      data: {
        organizationId,
        referenceNo: `APP-BULK-${label}-${suffix}`,
        candidateId: candidate.id,
        requisitionId: requisition.id,
        status: "APPLIED",
      },
    });
    return candidate;
  }

  const first = await applicant("One");
  const second = await applicant("Two");
  const login = await page.request.post("/api/auth/sign-in/email", {
    data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
  });
  expect(login.ok()).toBeTruthy();

  const dashboardBeforeResponse = await page.request.get("/api/v1/dashboards/hr");
  expect(dashboardBeforeResponse.ok()).toBeTruthy();
  const dashboardBefore = (await dashboardBeforeResponse.json()).data;

  await page.goto("/hr/candidates");
  await page.getByRole("checkbox", { name: `Select Bulk ${first.lastName}` }).check();
  await page.getByRole("checkbox", { name: `Select Bulk ${second.lastName}` }).check();
  await expect(page.getByText("2 selected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove selected" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Remove 2 candidates?")).toBeVisible();
  await dialog
    .getByPlaceholder("Record why these candidates are being removed")
    .fill("Duplicate recruitment campaign records");
  await dialog.getByRole("button", { name: "Remove selected" }).click();

  await expect(page.getByText(first.referenceNo)).toHaveCount(0);
  await expect(page.getByText(second.referenceNo)).toHaveCount(0);

  const removed = await db.candidate.findMany({
    where: { id: { in: [first.id, second.id] } },
    select: {
      status: true,
      activities: { where: { action: "CANDIDATE_REMOVED" }, select: { note: true } },
    },
  });
  expect(removed).toHaveLength(2);
  expect(removed.every((candidate) => candidate.status === "REJECTED")).toBeTruthy();
  expect(
    removed.every(
      (candidate) => candidate.activities[0]?.note === "Duplicate recruitment campaign records",
    ),
  ).toBeTruthy();

  const archiveResponse = await page.request.get(
    `/api/v1/candidates?view=archive&page=1&pageSize=100&q=${encodeURIComponent(suffix)}`,
  );
  expect(archiveResponse.ok()).toBeTruthy();
  const archivedItems = (await archiveResponse.json()).data.items as Array<{ id: string }>;
  expect(archivedItems.map((candidate) => candidate.id)).toEqual(
    expect.arrayContaining([first.id, second.id]),
  );

  const dashboardAfterResponse = await page.request.get("/api/v1/dashboards/hr");
  expect(dashboardAfterResponse.ok()).toBeTruthy();
  const dashboardAfter = (await dashboardAfterResponse.json()).data;
  expect(dashboardAfter.overview.applications).toBe(dashboardBefore.overview.applications - 2);
});
