import { test, expect } from "@playwright/test";

// M6 key-required live connectors (#84): NASA FIRMS (active fire) + OpenAQ (air
// quality). The gateway gates them on BOTH the toggle AND a stored key, so they
// 503 when off and *still* 503 when enabled without a key. No key is set in CI,
// so this proves the gating without ever calling the upstream.

const FIRES = "/api/map/fires?west=-10&south=40&east=10&north=55";
const AIR = "/api/map/air?lat=48.85&lng=2.35";

test("FIRMS + OpenAQ 503 when off", async ({ request }) => {
  for (const id of ["nasa-firms", "openaq"]) {
    await request.patch("/api/toggles", { data: { api_id: id, enabled: false } });
  }
  expect((await request.get(FIRES)).status()).toBe(503);
  expect((await request.get(AIR)).status()).toBe(503);
});

test("FIRMS + OpenAQ still 503 when enabled without a key (key-gated)", async ({ request }) => {
  // Enable, but set no key → the gateway must still refuse.
  await request.patch("/api/toggles", { data: { api_id: "nasa-firms", enabled: true, api_key: "" } });
  await request.patch("/api/toggles", { data: { api_id: "openaq", enabled: true, api_key: "" } });
  expect((await request.get(FIRES)).status()).toBe(503);
  expect((await request.get(AIR)).status()).toBe(503);
  // Leave them off + keyless for later specs.
  await request.patch("/api/toggles", { data: { api_id: "nasa-firms", enabled: false } });
  await request.patch("/api/toggles", { data: { api_id: "openaq", enabled: false } });
});

test("missing bbox / coords → 400", async ({ request }) => {
  expect((await request.get("/api/map/fires")).status()).toBe(400);
  expect((await request.get("/api/map/air")).status()).toBe(400);
});

test("map: FIRMS + OpenAQ layer toggles are present", async ({ page }) => {
  await page.goto("/map");
  await expect(page.getByText("Active fires (FIRMS)")).toBeVisible();
  await expect(page.getByText("Air quality (OpenAQ)")).toBeVisible();
});
