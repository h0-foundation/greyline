import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Temp DB → migrations (incl. 017 geonames) run; insert a handful of cities and
// exercise search / by-country / nearest. Mirrors bundles.test.ts.
describe("geonames cities repository", () => {
  let dir: string;
  let geo: typeof import("./geonames");
  let closeDb: () => void;
  let getDb: typeof import("../index").getDb;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "greyline-geonames-"));
    process.env.GREYLINE_DATA_DIR = dir;
    geo = await import("./geonames");
    ({ getDb, closeDb } = await import("../index"));
    const db = getDb();
    const ins = db.prepare(
      `INSERT INTO geonames_cities (geonameid, name, asciiname, lat, lng, country_code, admin1_code, population, timezone) VALUES (?,?,?,?,?,?,?,?,?)`,
    );
    ins.run(2988507, "Paris", "Paris", 48.8566, 2.3522, "FR", "11", 2138551, "Europe/Paris");
    ins.run(2968815, "Paris (small)", "Paris", 48.6, 2.4, "FR", "11", 5000, "Europe/Paris");
    ins.run(2643743, "London", "London", 51.5085, -0.1257, "GB", "ENG", 7556900, "Europe/London");
    ins.run(5128581, "New York City", "New York City", 40.7143, -74.006, "US", "NY", 8175133, "America/New_York");
  });

  afterAll(() => {
    closeDb?.();
    rmSync(dir, { recursive: true, force: true });
  });

  it("searchCities ranks the most-populous match first", () => {
    const r = geo.searchCities("paris");
    expect(r[0]?.name).toBe("Paris");
    expect(r[0]?.population).toBe(2138551);
    expect(r.length).toBeGreaterThanOrEqual(2);
  });

  it("getCitiesByCountry filters + orders by population", () => {
    const fr = geo.getCitiesByCountry("fr");
    expect(fr.every((c) => c.country_code === "FR")).toBe(true);
    expect(fr[0]?.name).toBe("Paris");
  });

  it("nearestCities returns the closest city to a point", () => {
    const near = geo.nearestCities(48.86, 2.35, 1);
    expect(near[0]?.name).toBe("Paris");
    expect(near[0]?.distance_km).toBeLessThan(5);
  });
});
