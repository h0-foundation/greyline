import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Points the DB at a throwaway dir, then imports the repo so migrations (incl.
// offline_bundles, migration 006) run against it. Proves the schema + CHECK
// constraint and the upsert/round-trip the offline basemap relies on.
describe("offline_bundles repository", () => {
  let dir: string;
  let bundles: typeof import("./bundles");
  let closeDb: () => void;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "greyline-bundles-"));
    process.env.GREYLINE_DATA_DIR = dir;
    bundles = await import("./bundles");
    ({ closeDb } = await import("../index"));
  });

  afterAll(() => {
    closeDb?.();
    rmSync(dir, { recursive: true, force: true });
  });

  it("round-trips a map/world bundle", () => {
    bundles.upsertBundle({ id: "map-world", type: "map", region: "world", path: "public/geo/world.pmtiles", size: 2381852, checksum: "abc123" });
    const got = bundles.getMapBundle("world");
    expect(got?.type).toBe("map");
    expect(got?.region).toBe("world");
    expect(got?.path).toMatch(/world\.pmtiles$/);
    expect(got?.checksum).toBe("abc123");
    expect(got?.size).toBe(2381852);
    expect(bundles.getBundlesByType("map")).toHaveLength(1);
  });

  it("upsert replaces on id conflict — no duplicate rows", () => {
    bundles.upsertBundle({ id: "map-world", type: "map", region: "world", path: "p2", size: 1, checksum: "z" });
    expect(bundles.getBundlesByType("map")).toHaveLength(1);
    expect(bundles.getMapBundle("world")?.checksum).toBe("z");
  });

  it("deleteBundle removes the row", () => {
    bundles.deleteBundle("map-world");
    expect(bundles.getMapBundle("world")).toBeUndefined();
    expect(bundles.getBundlesByType("map")).toHaveLength(0);
  });
});
