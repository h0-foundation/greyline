/**
 * Build the per-country **dossier** layer — comparable indices + CIA World
 * Factbook profiles. Run at setup/build time so runtime is fully offline.
 *
 *   pnpm build:dossier
 *
 * Sources (all open, no API key):
 *   - Transparency International CPI       via OWID grapher CSV (CC-BY 4.0)
 *   - RSF World Press Freedom Index        via OWID grapher CSV (CC-BY 4.0)
 *   - Henley/visa-free count                computed from the `visas` table
 *                                           that build-data.ts already imported
 *                                           (ilyankou/passport-index-dataset, MIT)
 *   - CIA World Factbook (per-country)     factbook/factbook.json (Public Domain)
 *
 * Robust to source flake: if one source 404s the others still seed.
 */
import { getDb, closeDb } from "../server/db/index";

type Db = ReturnType<typeof getDb>;

// ── CSV utilities ────────────────────────────────────────────────────────────
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) { console.warn(`! ${res.status} ${url}`); return null; }
    return await res.text();
  } catch (e) {
    console.warn(`! fetch error ${url}: ${(e as Error).message}`);
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch { return null; }
}

function recordSource(db: Db, s: {
  id: string; name: string; license: string; url: string; category: string; rowCount: number; version?: string;
}) {
  db.prepare(
    `INSERT INTO data_sources (id, name, license, url, category, row_count, version, downloaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET row_count = excluded.row_count, downloaded_at = datetime('now')`,
  ).run(s.id, s.name, s.license, s.url, s.category, s.rowCount, s.version ?? null);
}

// ISO3 → ISO2 — derived from the already-imported country_profiles.rest_countries JSON.
function loadIso3ToIso2(db: Db): Map<string, string> {
  const m = new Map<string, string>();
  const rows = db.prepare("SELECT country_code, rest_countries FROM country_profiles").all() as { country_code: string; rest_countries: string | null }[];
  for (const r of rows) {
    if (!r.rest_countries) continue;
    try {
      const rc = JSON.parse(r.rest_countries) as { cca3?: string };
      if (rc.cca3) m.set(rc.cca3.toUpperCase(), r.country_code.toUpperCase());
    } catch { /* skip */ }
  }
  return m;
}

// ── CPI (Transparency Intl, via OWID) ────────────────────────────────────────
async function importCpi(db: Db, iso3to2: Map<string, string>): Promise<number> {
  const url = "https://ourworldindata.org/grapher/ti-corruption-perception-index.csv";
  const csv = await fetchText(url);
  if (!csv) { console.warn("CPI skipped"); return 0; }
  const rows = parseCsv(csv);
  const header = rows.shift()!;
  const iCode = header.indexOf("Code");
  const iYear = header.indexOf("Year");
  const iScoreA = header.indexOf("Corruption Perceptions Index");
  const iScoreB = header.indexOf("cpi_score");
  const iScore = iScoreA >= 0 ? iScoreA : iScoreB;
  if (iCode < 0 || iYear < 0 || iScore < 0) { console.warn("CPI columns missing"); return 0; }
  // Keep only the latest year per country.
  const latest = new Map<string, { score: number; year: number }>();
  for (const r of rows) {
    const code3 = (r[iCode] || "").toUpperCase();
    const iso2 = iso3to2.get(code3);
    if (!iso2) continue;
    const yr = parseInt(r[iYear], 10);
    const score = parseFloat(r[iScore]);
    if (!Number.isFinite(yr) || !Number.isFinite(score)) continue;
    const cur = latest.get(iso2);
    if (!cur || yr > cur.year) latest.set(iso2, { score, year: yr });
  }
  const upsert = db.prepare(
    `INSERT INTO country_indices (iso2, cpi_score, cpi_year, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(iso2) DO UPDATE SET cpi_score=excluded.cpi_score, cpi_year=excluded.cpi_year, updated_at=excluded.updated_at`,
  );
  const tx = db.transaction((entries: [string, { score: number; year: number }][]) => {
    for (const [iso2, { score, year }] of entries) upsert.run(iso2, Math.round(score), year);
  });
  tx([...latest.entries()]);
  recordSource(db, {
    id: "ti-cpi",
    name: "Transparency International — Corruption Perceptions Index",
    license: "CC-BY 4.0 (via Our World in Data)",
    url,
    category: "indices",
    rowCount: latest.size,
  });
  console.log(`✓ CPI: ${latest.size} countries`);
  return latest.size;
}

// ── RSF Press Freedom (via OWID) ─────────────────────────────────────────────
async function importRsf(db: Db, iso3to2: Map<string, string>): Promise<number> {
  const url = "https://ourworldindata.org/grapher/press-freedom-index-rsf.csv";
  const csv = await fetchText(url);
  if (!csv) { console.warn("RSF skipped"); return 0; }
  const rows = parseCsv(csv);
  const header = rows.shift()!;
  const iCode = header.indexOf("Code");
  const iYear = header.indexOf("Year");
  const iScore = header.findIndex((h) => /press.+freedom|rsf|score/i.test(h));
  if (iCode < 0 || iYear < 0 || iScore < 0) { console.warn("RSF columns missing"); return 0; }
  // Latest year per country + rank within that year.
  const latestYearByIso: Map<string, { score: number; year: number }> = new Map();
  for (const r of rows) {
    const iso2 = iso3to2.get((r[iCode] || "").toUpperCase());
    if (!iso2) continue;
    const yr = parseInt(r[iYear], 10);
    const score = parseFloat(r[iScore]);
    if (!Number.isFinite(yr) || !Number.isFinite(score)) continue;
    const cur = latestYearByIso.get(iso2);
    if (!cur || yr > cur.year) latestYearByIso.set(iso2, { score, year: yr });
  }
  // Compute rank within the most-common latest year (RSF orders DESCENDING by free-est first).
  const all = [...latestYearByIso.entries()];
  const yearCount = new Map<number, number>();
  for (const [, v] of all) yearCount.set(v.year, (yearCount.get(v.year) ?? 0) + 1);
  const mostRecent = [...yearCount.entries()].sort((a, b) => b[0] - a[0])[0]?.[0] ?? 0;
  const sortedForRank = all
    .filter(([, v]) => v.year === mostRecent)
    .sort((a, b) => b[1].score - a[1].score); // higher score = freer; rank 1 best
  const rankByIso = new Map<string, number>();
  sortedForRank.forEach(([iso2], idx) => rankByIso.set(iso2, idx + 1));

  const upsert = db.prepare(
    `INSERT INTO country_indices (iso2, rsf_score, rsf_rank, rsf_year, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(iso2) DO UPDATE SET rsf_score=excluded.rsf_score, rsf_rank=excluded.rsf_rank, rsf_year=excluded.rsf_year, updated_at=excluded.updated_at`,
  );
  const tx = db.transaction((entries: [string, { score: number; year: number }][]) => {
    for (const [iso2, { score, year }] of entries) {
      upsert.run(iso2, +score.toFixed(2), rankByIso.get(iso2) ?? null, year);
    }
  });
  tx(all);
  recordSource(db, {
    id: "rsf-press-freedom",
    name: "Reporters Without Borders — Press Freedom Index",
    license: "CC-BY 4.0 (via Our World in Data)",
    url,
    category: "indices",
    rowCount: all.length,
  });
  console.log(`✓ RSF: ${all.length} countries (latest year ${mostRecent})`);
  return all.length;
}

// ── Visa-free count (compute from `visas` table already imported) ────────────
function computeVisaFreeCount(db: Db): number {
  // For each passport, count destinations with requirement in {visa_free, visa_on_arrival, eta, e_visa, home}
  // The classic Henley methodology treats visa-on-arrival as "visa-free" (no prior visa needed).
  // Treat home country as visa-free for self.
  const rows = db.prepare(
    `SELECT passport_iso2 AS iso2,
            SUM(CASE WHEN requirement IN ('visa_free','visa_on_arrival','eta','home') THEN 1 ELSE 0 END) AS n
       FROM visas
       GROUP BY passport_iso2`,
  ).all() as { iso2: string; n: number }[];
  if (rows.length === 0) { console.warn("visas table empty — run pnpm build:data first"); return 0; }
  const year = new Date().getFullYear();
  const upsert = db.prepare(
    `INSERT INTO country_indices (iso2, visa_free_count, visa_free_year, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(iso2) DO UPDATE SET visa_free_count=excluded.visa_free_count, visa_free_year=excluded.visa_free_year, updated_at=excluded.updated_at`,
  );
  const tx = db.transaction((all: { iso2: string; n: number }[]) => {
    for (const r of all) upsert.run(r.iso2.toUpperCase(), r.n, year);
  });
  tx(rows);
  console.log(`✓ Visa-free counts: ${rows.length} passports`);
  return rows.length;
}

// ── CIA World Factbook (per-country JSON) ────────────────────────────────────
type GhTreeNode = { path: string; type: "blob" | "tree" | string; size?: number };
type GhTreeResp = { tree: GhTreeNode[]; truncated: boolean };

async function importFactbook(db: Db): Promise<number> {
  // 1) List every json under each region folder.
  console.log("Factbook: enumerating tree…");
  const tree = await fetchJson<GhTreeResp>(
    "https://api.github.com/repos/factbook/factbook.json/git/trees/master?recursive=1",
  );
  if (!tree) { console.warn("Factbook tree fetch failed"); return 0; }
  if (tree.truncated) console.warn("Factbook tree truncated — partial coverage");
  const REGIONS = new Set([
    "africa","antarctica","australia-oceania","central-america-n-caribbean","central-asia",
    "east-n-southeast-asia","europe","meso","middle-east","north-america","oceans",
    "south-america","south-asia","world",
  ]);
  const files = tree.tree.filter((n) => {
    if (n.type !== "blob") return false;
    const parts = n.path.split("/");
    return parts.length === 2 && REGIONS.has(parts[0]) && parts[1].endsWith(".json");
  });
  console.log(`Factbook: ${files.length} country files to fetch`);

  // 2) Build a name → ISO2 lookup from country_profiles (REST Countries names).
  const profileRows = db.prepare("SELECT country_code, rest_countries FROM country_profiles").all() as { country_code: string; rest_countries: string | null }[];
  const nameToIso = new Map<string, string>();
  function norm(s: string): string {
    return s.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }
  for (const r of profileRows) {
    if (!r.rest_countries) continue;
    try {
      const rc = JSON.parse(r.rest_countries) as {
        name?: { common?: string; official?: string };
        altSpellings?: string[];
      };
      const names = new Set<string>();
      if (rc.name?.common) names.add(rc.name.common);
      if (rc.name?.official) names.add(rc.name.official);
      for (const alt of rc.altSpellings ?? []) names.add(alt);
      for (const n of names) nameToIso.set(norm(n), r.country_code.toUpperCase());
    } catch { /* skip */ }
  }

  // 3) Fetch in batches of 8.
  const upsert = db.prepare(
    `INSERT INTO country_factbook (iso2, gec_code, data, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(iso2) DO UPDATE SET gec_code=excluded.gec_code, data=excluded.data, updated_at=excluded.updated_at`,
  );

  let ok = 0;
  let skipped = 0;
  const queue = [...files];
  const BATCH = 8;
  while (queue.length) {
    const batch = queue.splice(0, BATCH);
    const fetched = await Promise.all(batch.map(async (n) => {
      const url = `https://raw.githubusercontent.com/factbook/factbook.json/master/${n.path}`;
      const json = await fetchJson<Record<string, unknown>>(url);
      const gec = n.path.split("/")[1].replace(/\.json$/, "");
      return { gec, path: n.path, json };
    }));
    for (const f of fetched) {
      if (!f.json) { skipped++; continue; }
      // Pull country name out of the factbook record.
      const gov = (f.json["Government"] as Record<string, unknown> | undefined) ?? {};
      const cn = (gov["Country name"] as Record<string, unknown> | undefined) ?? {};
      const short = (cn["conventional short form"] as { text?: string } | undefined)?.text ?? "";
      const long = (cn["conventional long form"] as { text?: string } | undefined)?.text ?? "";
      const candidates = [short, long].filter(Boolean);
      let iso2: string | undefined;
      for (const c of candidates) {
        const m = nameToIso.get(norm(c));
        if (m) { iso2 = m; break; }
      }
      if (!iso2) { skipped++; continue; }
      upsert.run(iso2, f.gec, JSON.stringify(f.json));
      ok++;
    }
    if (ok % 40 < BATCH) console.log(`  factbook: ${ok}/${files.length} (skipped ${skipped})`);
  }
  recordSource(db, {
    id: "cia-factbook",
    name: "CIA World Factbook (mirror)",
    license: "Public domain (US government work)",
    url: "https://github.com/factbook/factbook.json",
    category: "dossier",
    rowCount: ok,
  });
  console.log(`✓ Factbook: ${ok} countries (skipped ${skipped} unmapped/empty)`);
  return ok;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const db = getDb();
  const iso3to2 = loadIso3ToIso2(db);
  if (iso3to2.size === 0) {
    console.error("country_profiles empty — run `pnpm build:countries` first.");
    process.exit(1);
  }
  await importCpi(db, iso3to2);
  await importRsf(db, iso3to2);
  computeVisaFreeCount(db);
  await importFactbook(db);
  closeDb();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
