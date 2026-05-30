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

test("tools: emergency card renders numbers + first-actions for a country", async ({ page }) => {
  await page.goto("/tools/emergency?c=US");
  await expect(page.getByRole("heading", { name: /Emergency card/i, level: 1 })).toBeVisible();
  // The card renders for any country in the bundle; labels are stable even if a
  // specific number is missing from the bundled data.
  await expect(page.getByText("Police")).toBeVisible();
  await expect(page.getByText("Ambulance")).toBeVisible();
  await expect(page.getByText(/contact your embassy or consulate/i)).toBeVisible();
});

test("tools: emergency card shows an empty prompt with no country", async ({ page }) => {
  await page.goto("/tools/emergency");
  await expect(page.getByRole("heading", { name: /Emergency card/i, level: 1 })).toBeVisible();
  await expect(page.getByText(/Choose a destination/i)).toBeVisible();
});
