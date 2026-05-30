import { test, expect } from "@playwright/test";

// SDR / egress route planner (M3 — maps slice). Own spec file so feature
// branches don't collide on app.spec.ts. The map-draw interaction is hard to
// drive headlessly, so the persistence path is exercised through the API
// (deterministic, offline) and the page render is asserted directly.

test("tools: route planner renders with route-type controls", async ({ page }) => {
  await page.goto("/tools/route-planner");
  await expect(page.getByRole("heading", { name: /Route planner/i, level: 1 })).toBeVisible();
  // The four route types + the draw control.
  await expect(page.getByRole("button", { name: "SDR" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Extraction" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Variation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Draw", exact: true })).toBeVisible();
  // Empty state until a route is saved.
  await expect(page.getByText(/No routes yet/i)).toBeVisible();
});

test("api: routes persist (create → list → delete) with validation", async ({ request }) => {
  // Rejects a too-short path.
  const bad = await request.post("/api/routes", { data: { type: "sdr", waypoints: [{ lng: 1, lat: 1 }] } });
  expect(bad.status()).toBe(400);

  // Rejects an invalid type (allowlist + CHECK constraint).
  const badType = await request.post("/api/routes", {
    data: { type: "not-a-type", waypoints: [{ lng: 0, lat: 0 }, { lng: 1, lat: 1 }] },
  });
  expect(badType.status()).toBe(400);

  // Creates a valid SDR route.
  const create = await request.post("/api/routes", {
    data: {
      type: "sdr",
      name: "E2E probe route",
      waypoints: [{ lng: 0, lat: 0 }, { lng: 0.5, lat: 0.2 }, { lng: 1, lat: 1 }],
      distance_m: 12345,
    },
  });
  expect(create.status()).toBe(201);
  const { route } = (await create.json()) as { route: { id: string; type: string; name: string } };
  expect(route.type).toBe("sdr");
  expect(route.name).toBe("E2E probe route");

  // Lists it.
  const list = await request.get("/api/routes");
  const { routes } = (await list.json()) as { routes: { id: string }[] };
  expect(routes.some((r) => r.id === route.id)).toBe(true);

  // Cleans up.
  const del = await request.delete(`/api/routes/${route.id}`);
  expect(del.ok()).toBe(true);
  const after = await request.get("/api/routes");
  const { routes: rest } = (await after.json()) as { routes: { id: string }[] };
  expect(rest.some((r) => r.id === route.id)).toBe(false);
});
