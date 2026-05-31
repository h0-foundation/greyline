import { test, expect } from "@playwright/test";

// M6 GeoNames offline gazetteer (#84). The cities table is seeded by build:data
// (committed cities5000 snapshot) so this runs air-gapped in CI.
test("gazetteer: offline city lookup by name, country, and nearest", async ({ request }) => {
  const byName = await (await request.get("/api/cities?q=London")).json();
  expect(byName.ok).toBeTruthy();
  expect(byName.cities.some((c: { name: string; country_code: string }) => /London/i.test(c.name) && c.country_code === "GB")).toBeTruthy();

  const byCountry = await (await request.get("/api/cities?country=FR")).json();
  expect(byCountry.ok).toBeTruthy();
  expect(byCountry.cities.length).toBeGreaterThan(0);
  expect(byCountry.cities.every((c: { country_code: string }) => c.country_code === "FR")).toBeTruthy();

  const near = await (await request.get("/api/cities?lat=48.8566&lng=2.3522")).json();
  expect(near.ok).toBeTruthy();
  expect(near.cities[0]?.name).toMatch(/Paris/i);
});

test("geocode: falls back to the offline gazetteer when Nominatim is off", async ({ request }) => {
  // Nominatim is an opt-in connector; force it off so the offline path is
  // exercised deterministically (CI seeds it off; local DBs may have it on).
  await request.patch("/api/toggles", { data: { api_id: "nominatim", enabled: false } });
  const res = await request.get("/api/geocode?q=Paris");
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data.ok).toBeTruthy();
  expect(data.source).toBe("offline");
  expect(data.results[0]?.display_name).toMatch(/Paris/i);
});
