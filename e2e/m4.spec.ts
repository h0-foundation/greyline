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

test("tools: image sanitizer re-encodes an upload in-browser and offers a clean download", async ({ page }) => {
  await page.goto("/tools/sanitize");
  await expect(page.getByRole("heading", { name: "Sanitize & redact", level: 1 }).first()).toBeVisible();
  await expect(page.getByText(/never uploaded/i).first()).toBeVisible();

  // A tiny valid PNG; the canvas re-encode + toBlob run client-side in headless.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.getByLabel("Image to sanitize").setInputFiles({ name: "secret.png", mimeType: "image/png", buffer: png });

  await page.getByRole("button", { name: "Sanitize", exact: true }).first().click();
  // The sanitized copy is offered as a same-name "-sanitized" download.
  await expect(page.getByRole("link", { name: /Download secret-sanitized\.png/i }).first()).toBeVisible({ timeout: 10_000 });
});

test("tools: entity extractor pulls identifiers from pasted text on-device", async ({ page }) => {
  await page.goto("/tools/entities");
  await expect(page.getByRole("heading", { name: "Entity extractor", level: 1 }).first()).toBeVisible();
  await page.getByLabel("Paste text to scan").fill("Email John Doe at john@acme.com or call +1 (415) 555-0132.");
  await expect(page.getByText("john@acme.com").first()).toBeVisible();
  await expect(page.getByText("John Doe").first()).toBeVisible();
});

test("cases: case-file with SHA-256 evidence + append-only chain of custody", async ({ page, request }) => {
  // Seed a case + one evidence item via the API (no external data → CI-safe).
  const c = await request.post("/api/cases", { data: { title: "E2E Investigation", summary: "test case" } });
  const caseId = (await c.json()).case.id;
  await request.post(`/api/cases/${caseId}/items`, {
    data: { kind: "observation", title: "First sighting", body: "Vehicle seen at the depot at 14:05." },
  });

  try {
    // List page shows the case. (`.first()` guards the View-Transition
    // double-render strict-mode flake — see #55.)
    await page.goto("/cases");
    await expect(page.getByRole("heading", { name: "Cases", level: 1 }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /E2E Investigation/i }).first()).toBeVisible();

    // Detail page: evidence body + chain-of-custody with both events + a hash.
    await page.goto(`/cases/${caseId}`);
    await expect(page.getByRole("heading", { name: "E2E Investigation", level: 1 }).first()).toBeVisible();
    await expect(page.getByText("Vehicle seen at the depot at 14:05.").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chain of custody" }).first()).toBeVisible();
    await expect(page.getByText("Case opened").first()).toBeVisible();
    await expect(page.getByText("Evidence added").first()).toBeVisible();
    // The intake SHA-256 anchor is shown (truncated, hex).
    await expect(page.getByText(/^[0-9a-f]{24}…$/).first()).toBeVisible();

    // Add another item through the UI and confirm it lands.
    await page.getByLabel("Evidence content").fill("Second note added via UI.");
    await page.getByRole("button", { name: /Add — hash & log/i }).first().click();
    await expect(page.getByText("Second note added via UI.").first()).toBeVisible();
  } finally {
    await request.delete(`/api/cases/${caseId}`);
  }
});
