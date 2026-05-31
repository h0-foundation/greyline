import { test, expect } from "@playwright/test";

// M6 pillar mode switcher (#84). Focuses the sidebar + tools on one pillar, and
// persists via /api/settings. Reset after each test so the default ("all") is
// restored for other specs.
test.afterEach(async ({ request }) => {
  await request.patch("/api/settings", { data: { pillar_mode: "all" } }).catch(() => {});
});

test("switching to a pillar filters the sidebar and persists", async ({ page }) => {
  await page.goto("/");
  // Scope to the sidebar nav (the home cockpit also links to /trips etc.).
  const nav = page.getByRole("navigation");
  // Default "all" shows every group.
  await expect(nav.getByRole("link", { name: "Trips", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Surveillance", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Cases", exact: true })).toBeVisible();

  // Focus on Investigation (journalism).
  await page.getByRole("combobox", { name: "Focus mode" }).click();
  await page.getByRole("option", { name: "Investigation" }).click();

  // Travel + counter-surveillance items drop; journalism (Cases) + cross-cutting stay.
  await expect(nav.getByRole("link", { name: "Trips", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Surveillance", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Cases", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Map", exact: true })).toBeVisible(); // cross-cutting

  // Persists across a reload.
  await page.reload();
  const nav2 = page.getByRole("navigation");
  await expect(nav2.getByRole("link", { name: "Cases", exact: true })).toBeVisible();
  await expect(nav2.getByRole("link", { name: "Trips", exact: true })).toHaveCount(0);
});

test("tools catalog narrows to the active pillar's groups", async ({ page }) => {
  await page.goto("/tools");
  await expect(page.getByRole("heading", { name: "Security" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verify & investigate" })).toBeVisible();

  await page.getByRole("combobox", { name: "Focus mode" }).click();
  await page.getByRole("option", { name: "Travel risk" }).click();

  await expect(page.getByRole("heading", { name: "On the ground" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verify & investigate" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Security" })).toHaveCount(0);
});
