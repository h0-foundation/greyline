/**
 * Offline data importer — downloads cleanly-licensed open datasets and bundles
 * them into the local SQLite DB. Run at build/setup time; never at runtime.
 *
 *   pnpm build:data
 *
 * Sources:
 *   - OurAirports airports.csv (Public Domain)
 *   - ilyankou/passport-index-dataset tidy-iso2 (MIT)
 */
import { getDb, closeDb } from "../server/db/index";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { gzipSync, gunzipSync } from "zlib";
import { execFileSync } from "child_process";
import { tmpdir } from "os";
import { resolve } from "path";

const BUNDLE_DIR = resolve("data/bundles/data");

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes, commas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else if (c === "\r") {
      // ignore
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function fetchTextRetry(url: string, attempts = 4): Promise<string> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      last = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000 * 2 ** i)); // 1s,2s,4s
    }
  }
  throw new Error(`Fetch failed after ${attempts} attempts (${url}): ${String(last)}`);
}

/**
 * Fetch a source, caching a gzipped snapshot under data/bundles/data so CI never
 * depends on the live host. In CI the committed snapshot is authoritative (no
 * network); locally we fetch fresh, refresh the snapshot, and fall back to it if
 * the upstream is down. This is what keeps `pnpm build:data` reproducible in CI.
 */
async function cachedFetch(url: string, snapshotFile: string): Promise<string> {
  const snap = resolve(BUNDLE_DIR, `${snapshotFile}.gz`);
  const readSnap = () => gunzipSync(readFileSync(snap)).toString("utf-8");
  if (process.env.CI && existsSync(snap)) {
    console.log(`  CI: using committed ${snapshotFile}.gz (no network)`);
    return readSnap();
  }
  try {
    const text = await fetchTextRetry(url);
    if (!existsSync(BUNDLE_DIR)) mkdirSync(BUNDLE_DIR, { recursive: true });
    writeFileSync(snap, gzipSync(Buffer.from(text, "utf-8")));
    return text;
  } catch (err) {
    if (existsSync(snap)) {
      console.warn(`  fetch failed (${String(err)}); using committed ${snapshotFile}.gz`);
      return readSnap();
    }
    throw err;
  }
}

function recordSource(db: ReturnType<typeof getDb>, s: {
  id: string; name: string; license: string; url: string; category: string; rowCount: number; version?: string;
}) {
  db.prepare(
    `INSERT INTO data_sources (id, name, license, url, category, row_count, version, downloaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET row_count = excluded.row_count, downloaded_at = datetime('now')`,
  ).run(s.id, s.name, s.license, s.url, s.category, s.rowCount, s.version ?? null);
}

const AIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const VISAS_URL =
  "https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/passport-index-tidy-iso2.csv";

function normalizeVisa(raw: string): { requirement: string; detail: string | null } {
  const v = raw.trim().toLowerCase();
  if (/^\d+$/.test(v)) return { requirement: "visa_free", detail: v };       // days visa-free
  if (v === "-1") return { requirement: "home", detail: null };
  if (v === "visa free") return { requirement: "visa_free", detail: null };
  if (v === "visa on arrival") return { requirement: "visa_on_arrival", detail: null };
  if (v === "e-visa") return { requirement: "e_visa", detail: null };
  if (v === "eta") return { requirement: "eta", detail: null };
  if (v === "no admission") return { requirement: "no_admission", detail: null };
  if (v === "visa required") return { requirement: "visa_required", detail: null };
  return { requirement: "visa_required", detail: raw };
}

async function importAirports(db: ReturnType<typeof getDb>) {
  console.log("Resolving OurAirports…");
  const csv = await cachedFetch(AIRPORTS_URL, "airports.csv");
  const rows = parseCsv(csv);
  const header = rows.shift()!;
  const col = (name: string) => header.indexOf(name);
  const cType = col("type"), cName = col("name"), cLat = col("latitude_deg"),
    cLng = col("longitude_deg"), cElev = col("elevation_ft"), cCountry = col("iso_country"),
    cRegion = col("iso_region"), cMuni = col("municipality"), cSched = col("scheduled_service"),
    cIcao = col("icao_code"), cIata = col("iata_code"), cIdent = col("ident");

  const insert = db.prepare(
    `INSERT INTO airports (ident, type, name, lat, lng, elevation_ft, iso_country, iso_region, municipality, scheduled_service, iata_code, icao_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(ident) DO UPDATE SET name=excluded.name, type=excluded.type, iata_code=excluded.iata_code`,
  );
  db.exec("DELETE FROM airports");
  let n = 0;
  const run = db.transaction((data: string[][]) => {
    for (const r of data) {
      const ident = r[cIdent];
      if (!ident) continue;
      insert.run(
        ident, r[cType] || null, r[cName] || ident,
        parseFloat(r[cLat]) || null, parseFloat(r[cLng]) || null,
        r[cElev] ? parseInt(r[cElev], 10) : null,
        r[cCountry] || null, r[cRegion] || null, r[cMuni] || null,
        r[cSched] === "yes" ? 1 : 0, r[cIata] || null, r[cIcao] || null,
      );
      n++;
    }
  });
  run(rows);
  console.log(`  airports: ${n} rows`);
  recordSource(db, { id: "ourairports", name: "OurAirports", license: "Public Domain", url: AIRPORTS_URL, category: "airports", rowCount: n });
  return { rows, n };
}

async function importVisas(db: ReturnType<typeof getDb>) {
  console.log("Resolving passport-index visa matrix…");
  const csv = await cachedFetch(VISAS_URL, "passport-index.csv");
  const rows = parseCsv(csv);
  rows.shift(); // header: Passport,Destination,Requirement
  const insert = db.prepare(
    `INSERT INTO visas (passport_iso2, dest_iso2, requirement, detail) VALUES (?, ?, ?, ?)
     ON CONFLICT(passport_iso2, dest_iso2) DO UPDATE SET requirement=excluded.requirement, detail=excluded.detail`,
  );
  db.exec("DELETE FROM visas");
  let n = 0;
  const run = db.transaction((data: string[][]) => {
    for (const r of data) {
      const [p, d, req] = r;
      if (!p || !d || !req) continue;
      const { requirement, detail } = normalizeVisa(req);
      insert.run(p.toUpperCase(), d.toUpperCase(), requirement, detail);
      n++;
    }
  });
  run(rows);
  console.log(`  visas: ${n} rows`);
  recordSource(db, { id: "passport-index", name: "Passport Index (ilyankou)", license: "MIT", url: VISAS_URL, category: "visas", rowCount: n });
}

const GEONAMES_URL = "https://download.geonames.org/export/dump/cities5000.zip";

/**
 * Resolve the GeoNames cities5000 dump as tab-delimited text. The source is a
 * ZIP; locally we download + `unzip -p` it (maintainer build dep) and cache a
 * gzipped snapshot. In CI the committed cities5000.txt.gz is authoritative — no
 * network, no unzip.
 */
async function resolveGeoNames(): Promise<string> {
  const snap = resolve(BUNDLE_DIR, "cities5000.txt.gz");
  const readSnap = () => gunzipSync(readFileSync(snap)).toString("utf-8");
  if (process.env.CI && existsSync(snap)) {
    console.log("  CI: using committed cities5000.txt.gz (no network)");
    return readSnap();
  }
  try {
    const res = await fetch(GEONAMES_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const zipPath = resolve(tmpdir(), `greyline-cities5000-${Date.now()}.zip`);
    writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
    const text = execFileSync("unzip", ["-p", zipPath, "cities5000.txt"], { maxBuffer: 64 * 1024 * 1024 }).toString("utf-8");
    if (!existsSync(BUNDLE_DIR)) mkdirSync(BUNDLE_DIR, { recursive: true });
    writeFileSync(snap, gzipSync(Buffer.from(text, "utf-8")));
    return text;
  } catch (err) {
    if (existsSync(snap)) {
      console.warn(`  cities5000 fetch failed (${String(err)}); using committed snapshot`);
      return readSnap();
    }
    throw err;
  }
}

async function importGeoNamesCities(db: ReturnType<typeof getDb>) {
  console.log("Resolving GeoNames cities5000…");
  const text = await resolveGeoNames();
  const insert = db.prepare(
    `INSERT INTO geonames_cities (geonameid, name, asciiname, lat, lng, country_code, admin1_code, population, timezone)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(geonameid) DO UPDATE SET name=excluded.name, population=excluded.population`,
  );
  db.exec("DELETE FROM geonames_cities");
  let n = 0;
  const run = db.transaction((lines: string[]) => {
    for (const line of lines) {
      if (!line) continue;
      const c = line.split("\t"); // geonameid,name,asciiname,alt,lat,lng,fclass,fcode,cc,cc2,admin1,...,pop(14),...,tz(17)
      if (c.length < 18) continue;
      const id = parseInt(c[0], 10);
      const lat = parseFloat(c[4]);
      const lng = parseFloat(c[5]);
      if (!Number.isFinite(id) || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      insert.run(id, c[1] || c[2] || "", c[2] || null, lat, lng, c[8] || null, c[10] || null, parseInt(c[14], 10) || 0, c[17] || null);
      n++;
    }
  });
  run(text.split("\n"));
  console.log(`  geonames_cities: ${n} rows`);
  recordSource(db, { id: "geonames-cities", name: "GeoNames cities (5000+)", license: "CC BY 4.0", url: GEONAMES_URL, category: "gazetteer", rowCount: n });
}

/** Load curated, hand-authored JSON (no download) into a table. */
function importCuratedJson(
  db: ReturnType<typeof getDb>,
  file: string,
  insertSql: string,
  toRow: (o: Record<string, unknown>) => unknown[],
  source: { id: string; name: string; license: string; url: string; category: string },
) {
  const path = resolve(BUNDLE_DIR, file);
  if (!existsSync(path)) { console.log(`  (skipped, missing) ${file}`); return; }
  const data = JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>[];
  const insert = db.prepare(insertSql);
  let n = 0;
  const run = db.transaction((rows: Record<string, unknown>[]) => {
    for (const o of rows) { insert.run(...toRow(o)); n++; }
  });
  run(data);
  console.log(`  ${file}: ${n} rows`);
  recordSource(db, { ...source, rowCount: n });
}

function importIntel(db: ReturnType<typeof getDb>) {
  console.log("Loading curated country intel…");
  importCuratedJson(
    db, "country-intel.json",
    `INSERT INTO country_intel (iso2, freedom_score, freedom_status, advisory_level, advisory_note, vpn_legality, vpn_note, decryption_compulsion, decryption_note, sim_registration, surveillance_note, gdpr_adequacy, lgbtq_legal_risk, photography_note, apis_pnr_note, biometric_entry_note, source_urls, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
     ON CONFLICT(iso2) DO UPDATE SET freedom_score=excluded.freedom_score, freedom_status=excluded.freedom_status, advisory_level=excluded.advisory_level, advisory_note=excluded.advisory_note, vpn_legality=excluded.vpn_legality, vpn_note=excluded.vpn_note, decryption_compulsion=excluded.decryption_compulsion, decryption_note=excluded.decryption_note, sim_registration=excluded.sim_registration, surveillance_note=excluded.surveillance_note, gdpr_adequacy=excluded.gdpr_adequacy, lgbtq_legal_risk=excluded.lgbtq_legal_risk, photography_note=excluded.photography_note, apis_pnr_note=excluded.apis_pnr_note, biometric_entry_note=excluded.biometric_entry_note, source_urls=excluded.source_urls, updated_at=datetime('now')`,
    (o) => [o.iso2, o.freedom_score ?? null, o.freedom_status ?? null, o.advisory_level ?? null, o.advisory_note ?? null, o.vpn_legality ?? null, o.vpn_note ?? null, o.decryption_compulsion ?? null, o.decryption_note ?? null, o.sim_registration ?? null, o.surveillance_note ?? null, o.gdpr_adequacy ? 1 : 0, o.lgbtq_legal_risk ?? null, o.photography_note ?? null, o.apis_pnr_note ?? null, o.biometric_entry_note ?? null, JSON.stringify(o.source_urls ?? [])],
    { id: "greyline-intel", name: "Greyline curated privacy posture", license: "Greyline (sourced)", url: "", category: "intel" },
  );
}

function importPractical(db: ReturnType<typeof getDb>) {
  console.log("Loading curated country practical…");
  importCuratedJson(
    db, "country-practical.json",
    `INSERT INTO country_practical (iso2, emergency_numbers, plug_types, voltage, frequency, driving_side, idp_required, cash_declaration, updated_at)
     VALUES (?,?,?,?,?,?,?,?,datetime('now'))
     ON CONFLICT(iso2) DO UPDATE SET emergency_numbers=excluded.emergency_numbers, plug_types=excluded.plug_types, voltage=excluded.voltage, frequency=excluded.frequency, driving_side=excluded.driving_side, idp_required=excluded.idp_required, cash_declaration=excluded.cash_declaration, updated_at=datetime('now')`,
    (o) => [o.iso2, JSON.stringify(o.emergency_numbers ?? {}), o.plug_types ?? null, o.voltage ?? null, o.frequency ?? null, o.driving_side ?? null, o.idp_required ? 1 : 0, o.cash_declaration ?? null],
    { id: "greyline-practical", name: "Greyline arrival data", license: "Greyline (sourced)", url: "", category: "practical" },
  );
}

async function main() {
  if (!existsSync(BUNDLE_DIR)) mkdirSync(BUNDLE_DIR, { recursive: true });
  const db = getDb();
  const { rows: airportRows } = await importAirports(db);
  // Keep a compact JSON bundle of scheduled-service airports for offline re-seed.
  writeFileSync(resolve(BUNDLE_DIR, "airports-count.json"), JSON.stringify({ total: airportRows.length }));
  await importVisas(db);
  await importGeoNamesCities(db);
  importIntel(db);
  importPractical(db);
  closeDb();
  console.log("Done.");
}

main().catch((err) => { console.error("Error:", err); process.exit(1); });
