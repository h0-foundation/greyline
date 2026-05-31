import { test, expect } from "@playwright/test";

// M6 Felt-style resizable map panels (#84). The floating control box became a
// docked, collapsible, resizable panel with tabs. This proves the tabs, the
// offline place search, and collapse — all without network.
test("map panel: tabs, offline search, and collapse", async ({ page }) => {
  await page.goto("/map");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  // Tabs present; Layers is the default (its toggles render).
  for (const t of ["Layers", "Features", "Search", "Packs"]) {
    await expect(page.getByRole("tab", { name: t })).toBeVisible();
  }
  await expect(page.getByText("Cameras & ALPR")).toBeVisible();

  // Features tab: saved-routes section.
  await page.getByRole("tab", { name: "Features" }).click();
  await expect(page.getByText("Saved routes", { exact: true })).toBeVisible();

  // Search tab: offline gazetteer lookup → a result appears and is clickable.
  await page.getByRole("tab", { name: "Search" }).click();
  const box = page.getByLabel("Search places");
  await box.fill("London");
  await box.press("Enter");
  await expect(page.getByRole("button", { name: /London/ }).first()).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /London/ }).first().click(); // flies the map; no throw

  // Packs tab: the register control.
  await page.getByRole("tab", { name: "Packs" }).click();
  await expect(page.getByRole("button", { name: "Register pack" })).toBeVisible();

  // Collapse the panel → the re-open affordance appears.
  await page.getByRole("button", { name: "Collapse panel" }).click();
  await expect(page.getByRole("button", { name: "Open panel" })).toBeVisible({ timeout: 10_000 });
});
