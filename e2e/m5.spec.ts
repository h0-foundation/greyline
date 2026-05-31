import { test, expect } from "@playwright/test";
import { mkdirSync, copyFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

// M5 — maps & platform pack. Own spec file so feature branches don't collide on
// app.spec.ts. All offline / on-device.

// Build a minimal PNG carrying a tEXt metadata chunk (CRC left zero — the
// stripper does byte surgery and doesn't verify CRC).
function pngWithText(): Buffer {
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    return Buffer.concat([len, Buffer.from(type, "ascii"), data, Buffer.alloc(4)]);
  };
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0])),
    chunk("tEXt", Buffer.from("Author Jane Doe", "ascii")),
    chunk("IDAT", Buffer.from([0x78, 0x9c, 0x00])),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("tools: metadata stripper scans a PNG and removes the tEXt chunk in-browser", async ({ page }) => {
  await page.goto("/tools/metadata");
  await expect(page.getByRole("heading", { name: "Metadata stripper", level: 1 }).first()).toBeVisible();
  await expect(page.getByText(/nothing is uploaded/i).first()).toBeVisible();

  await page.getByLabel("Image to scan & strip").setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: pngWithText(),
  });

  // The tEXt block is detected and a cleaned copy is offered for download —
  // the byte-surgery strip runs client-side in the headless browser.
  await expect(page.getByText(/metadata block/i).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("tEXt").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Download photo-clean\.png/i }).first()).toBeVisible();
});

test("tools: line-of-sight exposure computes per-observer sight on-device", async ({ page }) => {
  await page.goto("/tools/viewshed");
  await expect(page.getByRole("heading", { name: "Line-of-sight exposure", level: 1 }).first()).toBeVisible();

  // Your position.
  await page.getByLabel("Latitude", { exact: true }).fill("52.5000");
  await page.getByLabel("Longitude", { exact: true }).fill("13.4000");

  // First observer: ~20 m away, in range → has line of sight.
  await page.getByLabel("Lat", { exact: true }).first().fill("52.50018");
  await page.getByLabel("Lon", { exact: true }).first().fill("13.40030");

  // The exposure summary appears and reports a clear line of sight.
  await expect(page.getByText(/can see you/i).first()).toBeVisible();
  await expect(page.getByText("line of sight").first()).toBeVisible();
});

test("tools: hazard alerts rationalize a pasted feed offline (EEMUA-191)", async ({ page }) => {
  await page.goto("/tools/alerts");
  await expect(page.getByRole("heading", { name: "Hazard alerts", level: 1 }).first()).toBeVisible();

  // Open the offline paste panel and rationalize a 2-event USGS feed: one strong
  // quake, one weak — the strong one should rank Critical/High and surface first.
  await page.getByText("Rationalize a pasted feed (offline)").click();
  const feed = JSON.stringify({
    usgs: {
      features: [
        { id: "big", properties: { mag: 7.1, place: "Near coast", time: 1000 }, geometry: { coordinates: [120, -15, 10] } },
        { id: "small", properties: { mag: 3.2, place: "Inland", time: 2000 }, geometry: { coordinates: [10, 50, 5] } },
      ],
    },
  });
  await page.getByPlaceholder(/usgs/i).fill(feed);
  await page.getByRole("button", { name: "Rationalize", exact: true }).click();

  await expect(page.getByText(/prioritised alert/i).first()).toBeVisible();
  await expect(page.getByText("Near coast").first()).toBeVisible();
});

test("maps: offline world basemap loads air-gapped (PMTiles) and is registered", async ({ page, request }) => {
  // Block every cross-origin request to simulate an air-gap; the default
  // basemap must still render from the committed public/geo/world.pmtiles.
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) return route.continue();
    return route.abort();
  });
  const pmtilesResponse = page.waitForResponse((r) => r.url().includes("/geo/world.pmtiles"), { timeout: 20_000 });
  await page.goto("/map");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible({ timeout: 15_000 });
  // PMTiles issues a range read for the header; static serving answers 200/206.
  const pm = await pmtilesResponse;
  expect([200, 206]).toContain(pm.status());

  // The basemap is registered in the offline-bundle manifest with a checksum.
  const res = await request.get("/api/bundles");
  expect(res.ok()).toBeTruthy();
  const { bundles } = await res.json();
  const world = bundles.find((b: { region: string; type: string }) => b.region === "world" && b.type === "map");
  expect(world).toBeTruthy();
  expect(world.checksum).toBeTruthy();
  expect(world.path).toMatch(/world\.pmtiles$/);
});

test("maps: register a regional street pack, serve it with range, then unregister", async ({ request }) => {
  const dir = resolve("data/bundles/maps");
  mkdirSync(dir, { recursive: true });
  const file = "e2e-test-pack.pmtiles";
  const dest = resolve(dir, file);
  // The committed world basemap is a valid .pmtiles — reuse it as a fixture.
  copyFileSync(resolve("public/geo/world.pmtiles"), dest);
  try {
    const reg = await request.post("/api/bundles", { data: { file, name: "E2E Pack" } });
    expect(reg.ok()).toBeTruthy();
    const { bundle } = await reg.json();
    expect(bundle.region).toBe("E2E Pack");

    const list = await (await request.get("/api/bundles")).json();
    expect(list.bundles.some((b: { id: string }) => b.id === bundle.id)).toBeTruthy();

    // Served with HTTP range support — PMTiles needs 206 partial reads.
    const ranged = await request.get(`/api/tiles/${bundle.id}`, { headers: { Range: "bytes=0-99" } });
    expect(ranged.status()).toBe(206);
    expect(ranged.headers()["content-range"]).toMatch(/^bytes 0-99\//);

    const del = await request.delete(`/api/bundles/${bundle.id}`);
    expect(del.ok()).toBeTruthy();
    const after = await (await request.get("/api/bundles")).json();
    expect(after.bundles.some((b: { id: string }) => b.id === bundle.id)).toBeFalsy();
  } finally {
    rmSync(dest, { force: true });
  }
});
