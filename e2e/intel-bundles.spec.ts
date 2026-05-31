import { test, expect } from "@playwright/test";

// M6 bundled intel connectors (#84): OFAC sanctions screening + UCDP armed
// conflict. Both are seeded by build:data from committed snapshots, so this runs
// air-gapped in CI. They are offline datasets — no connector toggle to gate.

test("sanctions: offline OFAC screening over the bundled lists", async ({ request }) => {
  const all = await (await request.get("/api/sanctions")).json();
  expect(all.ok).toBeTruthy();
  expect(all.count).toBeGreaterThan(1000); // thousands of listed entities
  expect(all.results).toHaveLength(0); // no query → no results, just the count

  // "bank" appears on many SDN entries — a stable positive match.
  const hit = await (await request.get("/api/sanctions?q=bank")).json();
  expect(hit.ok).toBeTruthy();
  expect(hit.results.length).toBeGreaterThan(0);
  expect(["SDN", "Consolidated"]).toContain(hit.results[0].list);

  const clean = await (await request.get("/api/sanctions?q=zzqxnotarealname")).json();
  expect(clean.results).toHaveLength(0);
});

test("sanctions: the screening tool surfaces matches and a clean result", async ({ page }) => {
  await page.goto("/tools/sanctions");
  await expect(page.getByRole("heading", { name: "Sanctions screening" }).first()).toBeVisible();
  const box = page.getByLabel(/name to screen/i);
  await box.fill("bank");
  await expect(page.getByText(/possible match/i).first()).toBeVisible({ timeout: 10_000 });

  await box.fill("zzqxnotarealname");
  await expect(page.getByText(/No match for/i).first()).toBeVisible({ timeout: 10_000 });
});

test("conflict: bundled UCDP events power the map layer", async ({ request }) => {
  const res = await request.get("/api/map/conflict");
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data.ok).toBeTruthy();
  expect(data.events.length).toBeGreaterThan(0);
  const e = data.events[0];
  expect(typeof e.lat).toBe("number");
  expect(typeof e.lng).toBe("number");
  expect(e.deaths).toBeGreaterThanOrEqual(0);
});
