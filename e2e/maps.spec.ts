import { test, expect } from "@playwright/test";

// Maps pack (M3) — CCTV / ALPR coverage layer. Kept in its own file so feature
// branches don't collide on e2e/app.spec.ts. The live camera fetch needs the
// Overpass connection + network + zoom ≥ 8, so CI (offline, world zoom)
// deterministically hits the "zoom in" affordance — which still proves the
// layer is wired (the toggle reacted and the camera path ran).

test("map: CCTV & ALPR coverage layer is wired (renamed label + reactive toggle)", async ({ page, request }) => {
  await page.goto("/map");
  await expect(page.getByRole("heading", { name: "Map" })).toBeVisible();

  // The layer was "Cameras (nearby)"; it now advertises ALPR plate-readers.
  await expect(page.getByText("Cameras & ALPR")).toBeVisible();

  // The map must exist before the toggle handler can react to it.
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.waitForTimeout(1200);

  await page.getByRole("switch", { name: "Toggle Cameras & ALPR" }).click();

  // At world zoom (CI default — no/few seeded coords) the camera path asks the
  // user to zoom in; if a connection were on and reachable it would clear with
  // a count. Either response proves the layer reacted to the toggle.
  await expect(
    page.getByText(/Zoom in to load cameras/i).or(page.getByText(/enable connection in Settings/i)),
  ).toBeVisible({ timeout: 10_000 });

  // Keep CI hermetic: leave the Overpass connection off for later specs.
  await request.patch("/api/toggles", { data: { api_id: "overpass", enabled: false } }).catch(() => {});
});
