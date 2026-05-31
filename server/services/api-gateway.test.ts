import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Regression for the v1.1 adversarial-sweep finding: a stored API key can ride
// in the request URL (auth.in="path", e.g. FIRMS), and ofetch embeds the full
// URL in its thrown FetchError — which the route's fail() handler logs. proxyFetch
// must scrub the key out of any error before it escapes.
describe("proxyFetch key scrubbing", () => {
  let dir: string;
  let gw: typeof import("./api-gateway");
  let settings: typeof import("../db/repositories/settings");
  let closeDb: () => void;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "greyline-gw-"));
    process.env.GREYLINE_DATA_DIR = dir;
    gw = await import("./api-gateway");
    settings = await import("../db/repositories/settings");
    ({ closeDb } = await import("../db/index"));
    gw.setApiToggle("test-scrub", true);
    settings.setApiKey("test-scrub", "SUPERSECRETKEY");
  });

  afterAll(() => {
    closeDb?.();
    rmSync(dir, { recursive: true, force: true });
  });

  it("never lets a stored path-injected key escape in a thrown error", async () => {
    let msg = "";
    try {
      // Unreachable host → ofetch throws with the (key-bearing) URL in the message.
      await gw.proxyFetch({
        apiId: "test-scrub",
        url: "http://127.0.0.1:1/{KEY}/probe",
        auth: { in: "path", name: "{KEY}" },
        cacheTtlSeconds: 1,
      });
    } catch (e) {
      msg = String((e as { message?: string })?.message ?? e);
    }
    expect(msg).not.toContain("SUPERSECRETKEY");
    expect(msg).toContain("***");
  });
});
