import { test, expect } from "@playwright/test";

// End-to-end walkthrough of every surface against the production build.
// Mutating tests create-then-clean so the run is idempotent.

test("dashboard renders with live counts", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Greyline" })).toBeVisible();
  await expect(page.getByText("Country profiles")).toBeVisible();
  await expect(page.getByText(/nothing leaves this machine/i).first()).toBeVisible();
});

test("countries: search and open a briefing with privacy posture", async ({ page }) => {
  await page.goto("/countries");
  await page.getByPlaceholder("Search countries…").fill("united states");
  await page.locator('a[href="/countries/US"]').first().click();
  await expect(page).toHaveURL(/\/countries\/US/);
  await expect(page.getByText("What's captured about you here")).toBeVisible();
  await expect(page.getByText("VPN legality")).toBeVisible();
  await expect(page.getByText("Decryption compulsion")).toBeVisible();
});

test("countries: GB briefing shows decryption compulsion", async ({ page }) => {
  await page.goto("/countries/GB");
  await expect(page.getByText(/Can be compelled/i)).toBeVisible();
});

test("trips: create, see threat dial, generate OPSEC, then delete", async ({ page, request }) => {
  await page.goto("/trips");
  await page.getByRole("button", { name: "New trip" }).first().click();
  await page.getByLabel("Name").fill("E2E Test Trip");
  await page.getByRole("button", { name: "Create trip" }).click();
  await expect(page).toHaveURL(/\/trips\/[0-9a-f-]+/);
  const tripId = page.url().split("/trips/")[1];

  await expect(page.getByRole("heading", { name: "E2E Test Trip" })).toBeVisible();
  await expect(page.getByText("Threat level").first()).toBeVisible();

  // Add a destination, confirm it appears.
  await page.getByLabel("Country").fill("DE");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator('a[href="/countries/DE"]')).toBeVisible();

  // Generate phased OPSEC checklists.
  await page.getByRole("button", { name: /Generate for/ }).click();
  await expect(page.getByText("Pre-trip digital hygiene")).toBeVisible();

  // Clean up via the API.
  const res = await request.delete(`/api/trips/${tripId}`);
  expect(res.ok()).toBeTruthy();
});

test("tools hub lists tools; airports search returns Heathrow", async ({ page }) => {
  await page.goto("/tools");
  await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();
  await page.goto("/tools/airports");
  await page.getByPlaceholder(/Name, city, IATA/i).fill("heathrow");
  await expect(page.getByText(/London Heathrow/i).first()).toBeVisible({ timeout: 10_000 });
});

test("tools: visa checker resolves a passport to destinations", async ({ page }) => {
  await page.goto("/tools/visa");
  const input = page.getByLabel("Passport country code");
  await expect(input).toBeVisible();
  await input.fill("US");
  await input.press("Enter");
  // After selecting a passport, destination requirements load.
  await expect(page.getByText(/visa-free/i).first()).toBeVisible({ timeout: 10_000 });
});

test("settings: connection toggles render and offline switch is present", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("Master offline switch")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Optional data connections")).toBeVisible();
  await expect(page.getByText("Weather").first()).toBeVisible();
});

test("vault: shows lock screen", async ({ page }) => {
  await page.goto("/vault");
  await expect(page.getByRole("heading", { name: /your vault/i })).toBeVisible();
  await expect(page.getByLabel("Passphrase", { exact: true })).toBeVisible();
});

test("surveillance: log a sighting, see it, delete it", async ({ page, request }) => {
  await page.goto("/surveillance");
  await expect(page.getByRole("heading", { name: "Counter-surveillance" })).toBeVisible();
  await page.getByLabel("What did you observe?").fill("E2E sighting near station");
  await page.getByRole("button", { name: "Log sighting" }).click();
  await expect(page.getByText("E2E sighting near station")).toBeVisible({ timeout: 10_000 });

  // Clean up any sightings created.
  const res = await request.get("/api/surveillance");
  const data = await res.json();
  for (const s of data.sightings) {
    if (s.description?.includes("E2E")) await request.delete(`/api/surveillance/${s.id}`);
  }
});

test("map page renders (heading + attribution)", async ({ page }) => {
  await page.goto("/map");
  await expect(page.getByRole("heading", { name: "Map" })).toBeVisible();
  // WebGL may be unavailable in headless; assert the surface + OSM attribution
  // copy rather than a live GL canvas.
  await expect(page.getByText(/OpenStreetMap/i).first()).toBeVisible();
});

test("data sources page lists bundled datasets", async ({ page }) => {
  await page.goto("/about/data-sources");
  await expect(page.getByText("OurAirports")).toBeVisible();
  await expect(page.getByText(/Passport Index/)).toBeVisible();
});
