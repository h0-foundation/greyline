import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Temp DB → migrations (incl. 019 intel bundles) run; seed UCDP events +
// country-year rows and exercise the map + dossier reads. Mirrors geonames.test.ts.
describe("conflict (UCDP) repository", () => {
  let dir: string;
  let repo: typeof import("./conflict");
  let closeDb: () => void;
  let getDb: typeof import("../index").getDb;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "greyline-conflict-"));
    process.env.GREYLINE_DATA_DIR = dir;
    repo = await import("./conflict");
    ({ getDb, closeDb } = await import("../index"));
    const db = getDb();
    const ev = db.prepare(`INSERT INTO ucdp_events (lat, lng, year, deaths, type_of_violence, country, country_id, conflict_name, date_start) VALUES (?,?,?,?,?,?,?,?,?)`);
    ev.run(50.4, 30.5, 2024, 500, 1, "Ukraine", 369, "Ukraine: Donbas", "2024-01-01");
    ev.run(48.0, 37.8, 2024, 1200, 1, "Ukraine", 369, "Ukraine: Donbas", "2024-02-01");
    ev.run(21.9, 96.1, 2023, 30, 3, "Myanmar (Burma)", 775, "Government of Myanmar", "2023-05-01");
    const cy = db.prepare(`INSERT INTO ucdp_country_year (country, year, deaths, events) VALUES (?,?,?,?)`);
    cy.run("Ukraine", 2022, 90000, 7000);
    cy.run("Ukraine", 2023, 75000, 10000);
    cy.run("Ukraine", 2024, 68000, 10000);
    cy.run("Myanmar (Burma)", 2023, 5000, 800);
  });

  afterAll(() => {
    closeDb?.();
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns events deadliest-first", () => {
    const e = repo.getConflictEvents(10);
    expect(e[0].deaths).toBe(1200);
    expect(e[0].country).toBe("Ukraine");
  });

  it("builds a country trend by exact common name", () => {
    const t = repo.getConflictTrend("Ukraine");
    expect(t).not.toBeNull();
    expect(t!.country).toBe("Ukraine");
    expect(t!.total).toBe(233000);
    expect(t!.recent.at(-1)).toMatchObject({ year: 2024, deaths: 68000 });
    // recent is chronological after the reverse.
    expect(t!.recent[0].year).toBeLessThan(t!.recent.at(-1)!.year);
  });

  it("resolves a UCDP name alias (Myanmar → 'Myanmar (Burma)')", () => {
    const t = repo.getConflictTrend("Myanmar");
    expect(t?.country).toBe("Myanmar (Burma)");
    expect(t?.total).toBe(5000);
  });

  it("returns null for a country with no conflict record", () => {
    expect(repo.getConflictTrend("Iceland")).toBeNull();
  });
});
