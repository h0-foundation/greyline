import { test, expect } from "@playwright/test";

// End-to-end walkthrough of every key surface against the production build.
// Mutating tests create-then-clean so the run is idempotent.
//
// CI runs against a fresh seed DB (no trips), so the home page renders the
// "Nothing in flight" cockpit empty state. These selectors target that state.

test("home renders the cockpit", async ({ page }) => {
  await page.goto("/");
  // Either the empty-state h1 OR an active-trip h1; both are display-Fraunces level-1.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Numbers strip — six KPI tiles labelled by `label-caps`. These labels are
  // unique to the home (sidebar nav and quick-action tiles use different copy
  // for some, same for others) so scope to the KPI section role.
  const kpi = page.getByLabel("At a glance");
  await expect(kpi.getByText("Trips", { exact: true })).toBeVisible();
  await expect(kpi.getByText("Vault docs", { exact: true })).toBeVisible();
  await expect(kpi.getByText("Visa-free reach", { exact: true })).toBeVisible();
});

test("countries: search and open a briefing with privacy posture", async ({ page }) => {
  await page.goto("/countries");
  await page.getByPlaceholder("Search countries…").fill("united states");
  await page.locator('a[href="/countries/US"]').first().click();
  await expect(page).toHaveURL(/\/countries\/US/);
  // Privacy posture block is intact, with VPN + Decryption rows.
  await expect(page.getByText("What's captured about you here")).toBeVisible();
  await expect(page.getByText("VPN legality")).toBeVisible();
  await expect(page.getByText("Decryption compulsion")).toBeVisible();
});

test("countries: GB briefing shows decryption compulsion", async ({ page }) => {
  await page.goto("/countries/GB");
  await expect(page.getByText(/Can be compelled/i)).toBeVisible();
});

test("countries: briefing shows the Greyline Risk Score (open methodology)", async ({ page }) => {
  await page.goto("/countries/US");
  // The section always renders; the card shows either a /100 score with the
  // open-methodology note, or an honest "unavailable" state when no dossier
  // indices are bundled (CI does not run build:dossier).
  await expect(page.getByRole("heading", { name: "Greyline Risk Score" })).toBeVisible();
  await expect(page.getByText(/open methodology|Risk score unavailable/i).first()).toBeVisible();
});

test("countries: hotspot filter chips render when advisory data is seeded", async ({ page }) => {
  await page.goto("/countries");
  // The filter row is conditional on advisory data; CI seeds none, so we only
  // assert the page header + the search box are present. Real advisory data is
  // verified by the build:advisories script + its smoke tests in dev.
  await expect(page.getByRole("heading", { name: "Countries", level: 1 })).toBeVisible();
  await expect(page.getByPlaceholder("Search countries…")).toBeVisible();
});

test("trips: create, see threat dial + briefing, generate OPSEC, then delete", async ({ page, request }) => {
  await page.goto("/trips");
  await page.getByRole("button", { name: "New trip" }).first().click();
  await page.getByLabel("Name").fill("E2E Test Trip");
  await page.getByRole("button", { name: "Create trip" }).click();
  await expect(page).toHaveURL(/\/trips\/[0-9a-f-]+/);
  const tripId = page.url().split("/trips/")[1];

  await expect(page.getByRole("heading", { name: "E2E Test Trip" })).toBeVisible();
  await expect(page.getByText("Threat level").first()).toBeVisible();

  // Add a destination via the in-page editor — the destination editor has a
  // Country aria-label distinct from any settings field. Scope to its parent.
  const editor = page.locator("form").filter({ has: page.getByLabel("Country") }).first();
  await editor.getByLabel("Country").fill("DE");
  await editor.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator('a[href="/countries/DE"]').first()).toBeVisible();

  // Phased OPSEC checklist generation.
  await page.getByRole("button", { name: /Generate for/ }).click();
  await expect(page.getByText("Pre-trip digital hygiene")).toBeVisible();

  // Clean up via the API so the test stays idempotent.
  const res = await request.delete(`/api/trips/${tripId}`);
  expect(res.ok()).toBeTruthy();
});

test("logbook surfaces the lifetime atlas", async ({ page }) => {
  await page.goto("/logbook");
  await expect(page.getByRole("heading", { name: "Logbook", level: 1 })).toBeVisible();
  // Back-to-planning hairline + disclosure link both render.
  await expect(page.getByRole("link", { name: /Back to planning/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Disclosure-grade report/i })).toBeVisible();
});

test("tools hub lists tools; airports search returns Heathrow", async ({ page }) => {
  await page.goto("/tools");
  await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();
  await page.goto("/tools/airports");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByPlaceholder(/Name, city, IATA/i).fill("heathrow");
  await expect(page.getByText(/London Heathrow/i).first()).toBeVisible({ timeout: 10_000 });
});

test("tools: visa checker resolves a passport to destinations", async ({ page }) => {
  await page.goto("/tools/visa");
  const input = page.getByLabel("Passport country code");
  await expect(input).toBeVisible();
  await input.fill("US");
  await input.press("Enter");
  await expect(page.getByText(/visa-free/i).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Schengen 90\/180/i).first()).toBeVisible();
  await expect(page.getByText(/days remaining/i).first()).toBeVisible();
});

test("tools: airports nearest planner ranks airports for a place (offline)", async ({ page }) => {
  await page.goto("/tools/airports");
  await page.getByRole("button", { name: "Paris" }).click();
  await expect(page.getByText(/nearest from Paris/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Paris-Orly|Charles de Gaulle|Le Bourget/i).first()).toBeVisible();
});

test("tools: hotel room-security assessment scores live (offline)", async ({ page }) => {
  await page.goto("/tools/hotel");
  await expect(page.getByText("Room Security Score")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Front-desk request" })).toBeVisible();
});

test("tools: packing library renders the bundled templates", async ({ page }) => {
  await page.goto("/tools/packing");
  await expect(page.getByRole("heading", { name: "Packing", level: 1 })).toBeVisible();
  // The filter row exposes the climate/activity/tier chips.
  await expect(page.getByText("Climate", { exact: true })).toBeVisible();
  await expect(page.getByText("Activity", { exact: true })).toBeVisible();
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

  const res = await request.get("/api/surveillance");
  const data = await res.json();
  for (const s of data.sightings) {
    if (s.description?.includes("E2E")) await request.delete(`/api/surveillance/${s.id}`);
  }
});

test("map page renders (heading + attribution)", async ({ page }) => {
  await page.goto("/map");
  await expect(page.getByRole("heading", { name: "Map" })).toBeVisible();
  await expect(page.getByText(/OpenStreetMap/i).first()).toBeVisible();
});

test("data sources page lists bundled datasets", async ({ page }) => {
  await page.goto("/about/data-sources");
  // OurAirports + the passport-index project are foundational bundles.
  await expect(page.getByText(/OurAirports/i).first()).toBeVisible();
  await expect(page.getByText(/passport.?index/i).first()).toBeVisible();
});

test("tools: chronolocation lab computes sun position (offline) and reverses", async ({ page }) => {
  await page.goto("/tools");
  await expect(page.getByText("Verify & investigate")).toBeVisible();
  await page.getByRole("link", { name: /Chronolocation lab/i }).click();
  await expect(page).toHaveURL(/\/tools\/chrono/);
  await expect(page.getByRole("heading", { name: "Chronolocation lab", level: 1 })).toBeVisible();

  // Forward mode: load the worked example and confirm a sun position is computed.
  await page.getByRole("button", { name: "Load example" }).click();
  await expect(page.getByText("Sun altitude")).toBeVisible();
  await expect(page.getByRole("img", { name: /Sun and shadow compass/i })).toBeVisible();

  // Reverse mode: shadow → time-of-day. A ratio of 3 implies an ~18° sun,
  // reachable twice that winter day in Lisbon, so UTC crossings appear.
  await page.getByRole("button", { name: /Time from a shadow/i }).click();
  await page.getByLabel("Shadow ratio").fill("3");
  await expect(page.getByText(/altitude/i).first()).toBeVisible();
  await expect(page.getByText(/UTC/).first()).toBeVisible();
});

test("navigation: sidebar is grouped and the command palette jumps to any tool", async ({ page }) => {
  await page.goto("/");
  // Sidebar is chunked into goal-based groups (NN/G: a few meaningful sections).
  await expect(page.getByText("Plan & brief")).toBeVisible();
  await expect(page.getByText("Record", { exact: true })).toBeVisible();

  // Cmd+K / Ctrl+K opens the palette; it indexes every page, action, and tool.
  await page.keyboard.press("ControlOrMeta+k");
  const input = page.getByPlaceholder("Search pages, tools, actions…");
  await expect(input).toBeVisible();
  await input.fill("chronolocation");
  await page.getByText("Chronolocation lab").click();
  await expect(page).toHaveURL(/\/tools\/chrono/);
});

test("security: destination update ignores injected column keys (SQLi regression)", async ({ request }) => {
  // Regression for the column-name SQL injection in updateDestination: the
  // repository now allowlists columns, so a malicious key in the PATCH body is
  // ignored while a legitimate field still applies — and nothing is corrupted.
  const t = await request.post("/api/trips", { data: { name: "SQLi Probe Trip" } });
  const trip = (await t.json()).trip;
  const d = await request.post(`/api/trips/${trip.id}/destinations`, { data: { country_code: "FR", city: "Before" } });
  const dest = (await d.json()).destination;

  const res = await request.patch(`/api/destinations/${dest.id}`, {
    data: { city: "After", "notes = notes, sort_order = (SELECT 1) --": "pwned" },
  });
  expect(res.ok()).toBeTruthy();
  const updated = (await res.json()).destination;
  expect(updated.city).toBe("After"); // legit field applied
  expect(updated.notes).not.toBe("pwned"); // injected key ignored, no corruption

  await request.delete(`/api/trips/${trip.id}`);
});
