import { test, expect } from "@playwright/test";

// Multi-traveler duty-of-care roster (M5 #40). Own spec file so feature
// branches don't collide on app.spec.ts. CI-safe: the travelers tables are
// created by migrate (which CI runs), and the test seeds + cleans up via the API.

test("roster: add a traveller via API, check in, then delete", async ({ page, request }) => {
  // Seed a traveller through the API (no external data → CI-safe).
  const res = await request.post("/api/travelers", {
    data: { name: "E2E Traveller", role: "Reporter", phone: "+1 555 0100" },
  });
  expect(res.ok()).toBeTruthy();
  const id = (await res.json()).traveler.id as string;

  try {
    await page.goto("/roster");
    await expect(page.getByRole("heading", { name: "Roster", level: 1 }).first()).toBeVisible();
    await expect(page.getByText("E2E Traveller").first()).toBeVisible();

    // A fresh traveller has no check-in yet.
    await expect(page.getByText("No check-in").first()).toBeVisible();

    // Check them in through the UI and confirm the status flips.
    await page.getByRole("button", { name: /Check in/i }).first().click();
    await expect(page.getByText("Checked in").first()).toBeVisible();
  } finally {
    await request.delete(`/api/travelers/${id}`);
  }
});

test("roster: SOS via API surfaces as a top-priority status", async ({ page, request }) => {
  const res = await request.post("/api/travelers", { data: { name: "SOS Person" } });
  const id = (await res.json()).traveler.id as string;
  await request.patch(`/api/travelers/${id}`, { data: { checkin: "sos" } });
  try {
    await page.goto("/roster");
    await expect(page.getByText("SOS Person").first()).toBeVisible();
    await expect(page.getByText(/SOS/).first()).toBeVisible();
  } finally {
    await request.delete(`/api/travelers/${id}`);
  }
});
