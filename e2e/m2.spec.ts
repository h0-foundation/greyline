import { test, expect } from "@playwright/test";

// M2 — travel-risk spine. Own spec file so feature branches don't collide on
// app.spec.ts. Road-safety reframe: surface the leading cause of traveller
// injury death (road crashes) on the country dossier, which advisories and
// indices systematically under-weight.

test("country: road-safety panel leads with the per-country death rate", async ({ page }) => {
  await page.goto("/countries/US");
  await expect(page.getByRole("heading", { name: "Road safety" })).toBeVisible();
  // US is in the bundled WHO dataset → a per-100k figure + the calibrated message.
  await expect(page.getByText(/road deaths \/ 100k/i)).toBeVisible();
  await expect(page.getByText(/leading cause of injury death/i)).toBeVisible();
});

test("country: road-safety reframe still shows without a bundled rate", async ({ page }) => {
  await page.goto("/countries/AD"); // Andorra — not in the curated dataset
  await expect(page.getByRole("heading", { name: "Road safety" })).toBeVisible();
  await expect(page.getByText(/leading cause of injury death/i)).toBeVisible();
  await expect(page.getByText(/No bundled per-country rate/i)).toBeVisible();
});
