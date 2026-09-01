import { test, expect } from "@playwright/test";

test("public hiring form renders supported intake controls", async ({ page }) => {
  await page.goto("/apply/acme");
  await expect(page.getByRole("heading", { name: "Apply to Join Triple Minds" })).toBeVisible();
  await expect(page.getByLabel("First name")).toBeVisible();
  await expect(page.getByLabel("Resume/CV")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit application" })).toBeVisible();
});

test("HR candidate review page exposes tenant-scoped search entry", async ({ page }) => {
  await page.goto("/hr/candidates");
  await expect(page.getByRole("heading", { name: "Candidates" })).toBeVisible();
  await expect(page.getByPlaceholder("Search name, email, phone or skills")).toBeVisible();
});
