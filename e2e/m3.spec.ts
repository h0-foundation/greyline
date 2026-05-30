import { test, expect } from "@playwright/test";

// Counter-surveillance pack (M3) e2e — kept in its own file so feature branches
// don't collide on e2e/app.spec.ts. All offline / no seeded data required.

test("tools: threat-model wizard surfaces device-specific, tier-gated mitigations", async ({ page }) => {
  await page.goto("/tools/threat-model");
  await expect(page.getByRole("heading", { name: "Threat-model wizard", level: 1 })).toBeVisible();

  // Default device = Android, tier = Elevated → the IMSI vector with the Android 2G step.
  await expect(page.getByText(/Cell-site simulator/i).first()).toBeVisible();
  await expect(page.getByText(/Allow 2G/i).first()).toBeVisible();

  // Switch to iOS → the mitigation becomes Lockdown Mode (device-specific filtering).
  await page.getByRole("button", { name: "iPhone / iOS" }).click();
  await expect(page.getByText(/Lockdown Mode/i).first()).toBeVisible();

  // Raise to Extreme → the signals-isolation (Faraday) vector surfaces (tier gating).
  await page.getByRole("button", { name: "Extreme" }).click();
  await expect(page.getByText(/Faraday bag/i).first()).toBeVisible();
});
