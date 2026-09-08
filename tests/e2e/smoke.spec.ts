import { test, expect } from "@playwright/test";

test("root shows sign-in and redirects an authenticated member to the HR workspace", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  const signIn = await page.request.post("/api/auth/sign-in/email", {
    data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
  });
  expect(signIn.ok()).toBeTruthy();
  await page.goto("/");
  await expect(page).toHaveURL(/\/hr\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible(
    { timeout: 20_000 },
  );
  await page.goto("/hr/candidates");
  await expect(page).toHaveURL(/\/hr\/candidates$/);
  await expect(page.getByRole("heading", { name: "Candidates" })).toBeVisible();
  const candidateResponse = await page.request.get(
    `/api/v1/candidates/${process.env.E2E_CANDIDATE_ID}`,
    { headers: { "x-organization-id": process.env.E2E_ORGANIZATION_ID! } },
  );
  expect(candidateResponse.ok()).toBeTruthy();
  const candidate = (await candidateResponse.json()).data;
  await page.getByPlaceholder("Search name, email, phone or skills").fill(candidate.email);
  const [searchResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/candidates?q=") && response.request().method() === "GET",
    ),
    page.getByRole("button", { name: "Search" }).click(),
  ]);
  expect(searchResponse.ok()).toBeTruthy();
  await expect(page.getByText("You do not have permission to perform this action")).toHaveCount(0);
  await expect(page.getByText("Phase Candidate")).toBeVisible();
  const response = await page.request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).data.status).toBe("ok");
});
