import { expect, request as playwrightRequest, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test("loads persisted HR and recruitment dashboards with RBAC and tenant isolation", async ({
  page,
}) => {
  const db = new PrismaClient();
  const organizationId = process.env.E2E_ORGANIZATION_ID!;
  const otherOrganizationId = process.env.E2E_OTHER_ORGANIZATION_ID!;
  const userId = process.env.E2E_INTERVIEWER_ID!;
  const headers = { "x-organization-id": organizationId };

  await db.appNotification.create({
    data: {
      organizationId,
      userId,
      eventType: "DASHBOARD_E2E",
      title: "Persisted dashboard alert",
      body: "Open the persisted candidate workspace",
      actionableUrl: "/hr/candidates",
      channels: ["IN_APP"],
    },
  });
  await db.workflowTask.create({
    data: {
      organizationId,
      assignedToUserId: userId,
      sourceType: "INTERVIEW",
      sourceId: process.env.E2E_APPLICATION_ID!,
      title: "Persisted dashboard task",
      priority: "HIGH",
    },
  });

  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
      })
    ).ok(),
  ).toBeTruthy();

  await page.goto("/");
  await expect(page).toHaveURL(/\/hr\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ }),
  ).toBeVisible();
  await expect(page.getByText("Persisted dashboard alert")).toBeVisible();
  await expect(page.getByText("Persisted dashboard task")).toBeVisible();
  await expect(page.getByRole("link", { name: /1 Applications/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /1 Open positions/ })).toHaveAttribute(
    "href",
    "/hr/recruitment/dashboard",
  );

  const dashboardResponse = await page.request.get("/api/v1/dashboards/recruitment", {
    headers,
  });
  expect(dashboardResponse.ok()).toBeTruthy();
  const dashboard = (await dashboardResponse.json()).data;
  expect(dashboard.applications).toBe(1);
  expect(dashboard.pipelineCounts.INTERVIEW).toBe(1);
  expect(dashboard.openPositions).toBe(1);
  expect(dashboard.sourceEffectiveness).toEqual(
    expect.arrayContaining([expect.objectContaining({ source: "WALK_IN", applications: 1 })]),
  );

  await page.getByRole("link", { name: "Open recruitment" }).click();
  await expect(page).toHaveURL(/\/hr\/recruitment\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Recruitment pipeline" })).toBeVisible();
  await expect(page.getByRole("link", { name: /INTERVIEW 1/ })).toBeVisible();
  await page.getByRole("link", { name: /INTERVIEW 1/ }).click();
  await expect(page).toHaveURL(/\/hr\/candidates\?.*status=INTERVIEW/);
  await expect(page.getByText("Phase Candidate")).toBeVisible();

  const otherDashboard = await page.request.get("/api/v1/dashboards/recruitment", {
    headers: { "x-organization-id": otherOrganizationId },
  });
  expect(otherDashboard.ok()).toBeTruthy();
  expect((await otherDashboard.json()).data.applications).toBe(0);

  const outsideOrganization = await db.organization.create({
    data: { name: `Dashboard outside ${Date.now()}`, slug: `dashboard-outside-${Date.now()}` },
  });
  try {
    const outsideResponse = await page.request.get("/api/v1/dashboards/recruitment", {
      headers: { "x-organization-id": outsideOrganization.id },
    });
    expect(outsideResponse.status()).toBe(403);
  } finally {
    await db.organization.delete({ where: { id: outsideOrganization.id } });
  }

  const restricted = await playwrightRequest.newContext({
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3002",
  });
  try {
    expect(
      (
        await restricted.post("/api/auth/sign-in/email", {
          data: {
            email: process.env.E2E_LEAVE_APPROVER_EMAIL,
            password: process.env.E2E_LEAVE_APPROVER_PASSWORD,
          },
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await restricted.get("/api/v1/dashboards/hr", {
          headers: { "x-organization-id": organizationId },
        })
      ).status(),
    ).toBe(403);
  } finally {
    await restricted.dispose();
    await db.$disconnect();
  }
});
