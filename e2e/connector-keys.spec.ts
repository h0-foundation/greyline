import { test, expect } from "@playwright/test";

// M6 per-connector API-key platform (#84). The raw key must never be returned to
// the client — the toggles API exposes only has_key.
test("connector keys: stored, masked in the API, and clearable", async ({ request }) => {
  await request.patch("/api/toggles", { data: { api_id: "overpass", api_key: "e2e-secret-key" } });
  const list = await (await request.get("/api/toggles")).json();
  expect(list.find((t: { api_id: string }) => t.api_id === "overpass")?.has_key).toBe(true);
  // The raw key is never serialized to the client.
  expect(JSON.stringify(list)).not.toContain("e2e-secret-key");

  await request.patch("/api/toggles", { data: { api_id: "overpass", api_key: "" } });
  const after = await (await request.get("/api/toggles")).json();
  expect(after.find((t: { api_id: string }) => t.api_id === "overpass")?.has_key).toBe(false);
});
