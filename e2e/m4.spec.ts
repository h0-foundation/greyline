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
