import { test, expect } from "@playwright/test";

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
