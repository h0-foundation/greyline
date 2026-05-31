import { test, expect } from "@playwright/test";

// M2.5 per-trip tabbed workspace (#41). Own spec file so feature branches don't
// collide on app.spec.ts.
test("trips: workspace is tabbed; hash deep-links honour the tab; print link persists", async ({ page, request }) => {
  const res = await request.post("/api/trips", { data: { name: "Tab Workspace Trip" } });
  expect(res.ok()).toBeTruthy();
  const tripId = (await res.json()).trip.id;
  try {
    await page.goto(`/trips/${tripId}`);
    // Overview is the default tab: the trip header renders.
    await expect(page.getByRole("heading", { name: "Tab Workspace Trip" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();

    // Switching tabs reveals the matching panel (force-mounted, hidden when inactive).
    await page.getByRole("tab", { name: "Flights" }).click();
    await expect(page.getByRole("heading", { name: /Flights & layovers/ })).toBeVisible();

    await page.getByRole("tab", { name: "Packing" }).click();
    await expect(page.getByRole("heading", { name: "Packing", level: 2 })).toBeVisible();

    // Print briefing link lives outside the tabs and always navigates.
    await expect(page.getByRole("link", { name: /Print briefing/ })).toHaveAttribute(
      "href",
      `/trips/${tripId}/briefing/print`,
    );

    // A cockpit deep-link (/trips/[id]#documents) opens the matching tab. Come
    // from a different path so it's a full load and the mount effect reads the
    // hash — exactly how the home cockpit's #documents link behaves.
    await page.goto("/trips");
    await page.goto(`/trips/${tripId}#documents`);
    await expect(page.getByRole("heading", { name: "Documents", level: 2 })).toBeVisible();
  } finally {
    await request.delete(`/api/trips/${tripId}`);
  }
});
