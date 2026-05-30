import { test, expect } from "@playwright/test";

// M4 — journalism pack. Own spec file so feature branches don't collide on
// app.spec.ts. SIFT verification + source-protection playbooks. All offline.

test("tools: verify playbook — SIFT checklist + media + source protection", async ({ page }) => {
  await page.goto("/tools/verify");
  await expect(page.getByRole("heading", { name: "Verify & protect sources", level: 1 })).toBeVisible();

  // SIFT's four moves are present and the checklist toggles.
  await expect(page.getByText("Investigate the source")).toBeVisible();
  await page.getByRole("button", { name: /Trace to the original/i }).click();

  // Media-verification section cross-links the on-device tools.
  await expect(page.getByRole("link", { name: /Chronolocation lab/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /EXIF stripper/i })).toBeVisible();

  // Source-protection names the mainstream submission systems.
  await expect(page.getByText(/SecureDrop/i).first()).toBeVisible();
});

test("tools: image fingerprint hashes an uploaded image in-browser", async ({ page }) => {
  await page.goto("/tools/image-hash");
  await expect(page.getByRole("heading", { name: "Image fingerprint", level: 1 })).toBeVisible();
  await expect(page.getByText(/never leave this machine/i)).toBeVisible();

  // A tiny valid PNG, uploaded via a buffer — the hashing runs client-side in
  // the headless browser (canvas), proving the canvas→hash pipeline end-to-end.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.getByLabel("First image").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: png });

  // A 16-hex-char dHash appears once the image is processed.
  await expect(page.getByText(/^[0-9a-f]{16}$/).first()).toBeVisible({ timeout: 10_000 });
});
