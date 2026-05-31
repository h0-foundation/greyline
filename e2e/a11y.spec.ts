import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Accessibility sweep — every key route gets scanned against WCAG 2.2 AA.
// We fail the test on `serious` or `critical` violations only; `moderate` /
// `minor` are surfaced via the report artifact for triage but don't block CI.
//
// Manually-relevant checks axe can't fully catch:
//   - focus return after modal close (Dialog from Radix handles correctly)
//   - keyboard navigability of the MapLibre canvas (progressive enhancement;
//     StampWall provides the accessible link path)
//   - color contrast in both light & dark themes for the oak/gold palette
//     (axe runs against the rendered theme; CI runs only dark by default)

const ROUTES: ReadonlyArray<readonly [string, string]> = [
  ["/", "home"],
  ["/trips", "trips"],
  ["/logbook", "logbook"],
  ["/countries", "countries"],
  ["/countries/AD", "country-AD"],
  ["/countries/US", "country-US"],
  ["/map", "map"],
  ["/surveillance", "surveillance"],
  ["/cases", "cases"],
  ["/roster", "roster"],
  ["/tools", "tools"],
  ["/tools/airports", "tools-airports"],
  ["/tools/currency", "tools-currency"],
  ["/tools/weather", "tools-weather"],
  // /tools/advisories has been folded into /countries (advisory filter).
  ["/tools/visa", "tools-visa"],
  ["/tools/exif", "tools-exif"],
  ["/tools/metadata", "tools-metadata"],
  ["/tools/packing", "tools-packing"],
  ["/tools/flying", "tools-flying"],
  ["/tools/hotel", "tools-hotel"],
  ["/tools/border", "tools-border"],
  ["/tools/self-doxxing", "tools-self-doxxing"],
  ["/tools/threat-model", "tools-threat-model"],
  ["/tools/ble-tracker", "tools-ble-tracker"],
  ["/tools/route-planner", "tools-route-planner"],
  ["/tools/viewshed", "tools-viewshed"],
  ["/tools/alerts", "tools-alerts"],
  ["/tools/verify", "tools-verify"],
  ["/tools/image-hash", "tools-image-hash"],
  ["/tools/sanitize", "tools-sanitize"],
  ["/tools/entities", "tools-entities"],
  ["/tools/geolocate", "tools-geolocate"],
  ["/tools/sanctions", "tools-sanctions"],
  ["/tools/emergency?c=US", "tools-emergency"],
  ["/vault", "vault"],
  ["/settings", "settings"],
  ["/settings/data", "settings-data"],
  ["/about/data-sources", "about-data-sources"],
] as const;

for (const [path, name] of ROUTES) {
  test(`a11y · ${name}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("domcontentloaded");
    // Settle for client components + any first-paint animation.
    await page.waitForTimeout(name === "home" || name === "trips" || name === "map" ? 2_500 : 800);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      // The grain layer is a decorative `aria-hidden` SVG; axe occasionally flags
      // the data-URI gradient as missing alt — suppress that one false positive.
      .exclude(".grain")
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    if (blocking.length) {
      const summary = blocking
        .map((v) => `  · [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? "" : "s"})`)
        .join("\n");
      console.log(`\n${name} a11y violations:\n${summary}\n`);
    }

    expect(
      blocking,
      `${name} had ${blocking.length} serious/critical a11y violation${blocking.length === 1 ? "" : "s"}. See log for details.`,
    ).toHaveLength(0);
  });
}
