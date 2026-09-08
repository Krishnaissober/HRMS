import { test, expect } from "@playwright/test";

test("interview management pages expose scheduling and evaluation surfaces", async ({ page }) => {
  await page.goto("/hr/interviews");
  await expect(page.getByRole("heading", { name: "Interviews", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Create interview" }).click();
  await expect(page.getByRole("heading", { name: "Create interview" })).toBeVisible();
  await expect(page.getByLabel("Candidate ID")).toBeVisible();
  await expect(page.getByLabel("Interviewer", { exact: true })).toBeVisible();
});
