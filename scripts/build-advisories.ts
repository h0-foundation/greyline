/**
 * Refresh the multi-source travel advisories cache.
 *
 *   pnpm build:advisories
 *
 * Today: US State Dept + UK FCDO. Both via per-source API toggles (`travel-advisory`
 * and `uk-fcdo`) — script enables them for the duration of the fetch so it works
 * even on a fresh / fully-offline install, then restores their prior state.
 */
import { getDb, closeDb } from "../server/db/index";
import { getApiToggle, setApiToggle } from "../server/services/api-gateway";
import { fetchUsState, fetchUkFcdo, type NormalizedAdvisory } from "../server/api-clients/advisories-multi";

type Db = ReturnType<typeof getDb>;

async function withTempToggles<T>(ids: string[], run: () => Promise<T>): Promise<T> {
  const restore: Array<[string, boolean]> = [];
  for (const id of ids) {
    const cur = getApiToggle(id);
    restore.push([id, cur?.enabled === 1]);
    setApiToggle(id, true);
  }
  try { return await run(); }
  finally {
    for (const [id, was] of restore) setApiToggle(id, was);
  }
}

function loadIso3to2(db: Db): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of db.prepare("SELECT country_code, rest_countries FROM country_profiles").all() as { country_code: string; rest_countries: string | null }[]) {
    if (!r.rest_countries) continue;
    try {
      const rc = JSON.parse(r.rest_countries) as { cca3?: string };
      if (rc.cca3) m.set(rc.cca3.toUpperCase(), r.country_code.toUpperCase());
    } catch { /* skip */ }
  }
  return m;
}

function loadCommonNames(db: Db): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of db.prepare("SELECT country_code, rest_countries FROM country_profiles").all() as { country_code: string; rest_countries: string | null }[]) {
    if (!r.rest_countries) continue;
    try {
      const rc = JSON.parse(r.rest_countries) as { name?: { common?: string } };
      const name = rc.name?.common;
      if (name) m.set(r.country_code.toUpperCase(), name);
    } catch { /* skip */ }
  }
  return m;
}

function loadNameToIso2(db: Db): Map<string, string> {
  const m = new Map<string, string>();
  function nameKey(s: string): string {
    return s.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }
  for (const r of db.prepare("SELECT country_code, rest_countries FROM country_profiles").all() as { country_code: string; rest_countries: string | null }[]) {
    if (!r.rest_countries) continue;
    try {
      const rc = JSON.parse(r.rest_countries) as {
        name?: { common?: string; official?: string };
        altSpellings?: string[];
      };
      const all = new Set<string>();
      if (rc.name?.common) all.add(rc.name.common);
      if (rc.name?.official) all.add(rc.name.official);
      for (const a of rc.altSpellings ?? []) all.add(a);
      for (const n of all) m.set(nameKey(n), r.country_code.toUpperCase());
    } catch { /* skip */ }
  }
  return m;
}

function upsertAdvisories(db: Db, rows: NormalizedAdvisory[]) {
  const stmt = db.prepare(
    `INSERT INTO country_advisories (iso2, source, level, level_label, summary, url, updated, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(iso2, source) DO UPDATE SET
       level=excluded.level, level_label=excluded.level_label, summary=excluded.summary,
       url=excluded.url, updated=excluded.updated, fetched_at=excluded.fetched_at`,
  );
  const tx = db.transaction((data: NormalizedAdvisory[]) => {
    for (const a of data) stmt.run(a.iso2, a.source, a.level, a.level_label, a.summary, a.url, a.updated);
  });
  tx(rows);
}

async function main() {
  const db = getDb();
  const iso3to2 = loadIso3to2(db);
  const names = loadCommonNames(db);
  const nameToIso2 = loadNameToIso2(db);

  await withTempToggles(["travel-advisory", "uk-fcdo"], async () => {
    // ─ US State Dept ─
    console.log("US State Dept…");
    const us = await fetchUsState(iso3to2, nameToIso2);
    console.log(`  ${us.length} countries`);
    upsertAdvisories(db, us);

    // ─ UK FCDO ─ one fetch per country (with proxyFetch's per-URL cache).
    console.log("UK FCDO…");
    const iso2List = [...names.keys()];
    let ok = 0;
    let miss = 0;
    const BATCH = 6;
    for (let i = 0; i < iso2List.length; i += BATCH) {
      const slice = iso2List.slice(i, i + BATCH);
      const batch = await Promise.all(slice.map((iso2) => fetchUkFcdo(iso2, names.get(iso2) ?? iso2)));
      const got = batch.filter((b): b is NormalizedAdvisory => b !== null);
      upsertAdvisories(db, got);
      ok += got.length;
      miss += slice.length - got.length;
      if ((i + BATCH) % 60 < BATCH) console.log(`  ${ok} fetched / ${miss} no-page (of ${iso2List.length})`);
    }
    console.log(`  done: ${ok} ok, ${miss} no-page`);
  });

  closeDb();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
