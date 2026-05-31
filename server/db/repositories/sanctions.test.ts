import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Temp DB → migrations (incl. 019 intel bundles) run; seed a couple of entities
// with aliases and exercise screening. Mirrors geonames.test.ts.
describe("sanctions repository", () => {
  let dir: string;
  let repo: typeof import("./sanctions");
  let closeDb: () => void;
  let getDb: typeof import("../index").getDb;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "greyline-sanctions-"));
    process.env.GREYLINE_DATA_DIR = dir;
    repo = await import("./sanctions");
    ({ getDb, closeDb } = await import("../index"));
    const db = getDb();
    const e = db.prepare(`INSERT INTO sanctions_entries (list, ent_num, name, sdn_type, program, remarks) VALUES (?,?,?,?,?,?)`);
    const n = db.prepare(`INSERT INTO sanctions_names (list, ent_num, name, is_primary) VALUES (?,?,?,?)`);
    e.run("SDN", 1, "GUZMAN LOERA, Joaquin", "Individual", "SDNTK", "DOB 1957");
    n.run("SDN", 1, "GUZMAN LOERA, Joaquin", 1);
    n.run("SDN", 1, "El Chapo", 0);
    e.run("Consolidated", 2, "EXAMPLE TRADING CO", "Entity", "UKRAINE-EO13662", null);
    n.run("Consolidated", 2, "EXAMPLE TRADING CO", 1);
  });

  afterAll(() => {
    closeDb?.();
    rmSync(dir, { recursive: true, force: true });
  });

  it("counts listed entities", () => {
    expect(repo.sanctionsCount()).toBe(2);
  });

  it("matches a primary name (case-insensitive substring)", () => {
    const r = repo.screenSanctions("guzman");
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe("GUZMAN LOERA, Joaquin");
    expect(r[0].matched_via).toBe("name");
    expect(r[0].aliases).toContain("El Chapo");
  });

  it("matches via an alias and flags it", () => {
    const r = repo.screenSanctions("el chapo");
    expect(r).toHaveLength(1);
    expect(r[0].ent_num).toBe(1);
    expect(r[0].matched_via).toBe("alias");
  });

  it("returns the Consolidated list label", () => {
    const r = repo.screenSanctions("example trading");
    expect(r[0].list).toBe("Consolidated");
  });

  it("returns nothing for a clean name or too-short query", () => {
    expect(repo.screenSanctions("definitely-not-listed")).toHaveLength(0);
    expect(repo.screenSanctions("a")).toHaveLength(0);
  });
});
