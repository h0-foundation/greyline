/**
 * Seed the bundled trip-planning templates: packing, airline rules, OPSEC,
 * and per-country documents.
 *
 *   pnpm build:trip-data
 *
 * Reads from `data/templates/*.json` — those files ARE the canonical source of
 * truth. Edit a JSON, re-run this, and the DB upserts in place. No network at
 * any point.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { getDb, closeDb } from "../server/db/index";

type Db = ReturnType<typeof getDb>;

function recordSource(db: Db, s: {
  id: string; name: string; license: string; url: string; category: string; rowCount: number; version?: string;
}) {
  db.prepare(
    `INSERT INTO data_sources (id, name, license, url, category, row_count, version, downloaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET row_count = excluded.row_count, downloaded_at = datetime('now')`,
  ).run(s.id, s.name, s.license, s.url, s.category, s.rowCount, s.version ?? null);
}

// ─ Packing ──────────────────────────────────────────────────────────────────
interface PackingSeed {
  id: string;
  category: string;
  label: string;
  description?: string;
  climate_tags?: string[];
  activity_tags?: string[];
  threat_tier_min?: number;
  iso2?: string;
  optional?: boolean;
  source_url?: string;
  sort_order?: number;
}

function importPacking(db: Db): number {
  const path = resolve("data/templates/packing.json");
  const rows = JSON.parse(readFileSync(path, "utf8")) as PackingSeed[];
  const stmt = db.prepare(
    `INSERT INTO packing_templates
       (id, category, label, description, climate_tags, activity_tags, threat_tier_min, iso2, optional, source_url, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       category=excluded.category, label=excluded.label, description=excluded.description,
       climate_tags=excluded.climate_tags, activity_tags=excluded.activity_tags,
       threat_tier_min=excluded.threat_tier_min, iso2=excluded.iso2, optional=excluded.optional,
       source_url=excluded.source_url, sort_order=excluded.sort_order`,
  );
  const tx = db.transaction((data: PackingSeed[]) => {
    for (const r of data) {
      stmt.run(
        r.id, r.category, r.label, r.description ?? null,
        JSON.stringify(r.climate_tags ?? []),
        JSON.stringify(r.activity_tags ?? []),
        r.threat_tier_min ?? 0, r.iso2 ?? null, r.optional ? 1 : 0,
        r.source_url ?? null, r.sort_order ?? 0,
      );
    }
  });
  tx(rows);
  console.log(`✓ Packing templates: ${rows.length}`);
  return rows.length;
}

// ─ Airlines ─────────────────────────────────────────────────────────────────
interface AirlineSeed {
  carrier_iata: string;
  carrier_name: string;
  alliance?: string | null;
  cabin_l_cm?: number | null;
  cabin_w_cm?: number | null;
  cabin_h_cm?: number | null;
  cabin_weight_kg?: number | null;
  personal_l_cm?: number | null;
  personal_w_cm?: number | null;
  personal_h_cm?: number | null;
  checked_weight_kg?: number | null;
  checked_dim_total_cm?: number | null;
  liquids_ml?: number;
  lithium_wh_installed_max?: number | null;
  lithium_wh_spare_max?: number | null;
  lithium_spare_qty_max?: number | null;
  notes?: string;
  source_url?: string;
}

function importAirlines(db: Db): number {
  const path = resolve("data/templates/airlines.json");
  const rows = JSON.parse(readFileSync(path, "utf8")) as AirlineSeed[];
  const stmt = db.prepare(
    `INSERT INTO airline_rules
       (carrier_iata, carrier_name, alliance, cabin_l_cm, cabin_w_cm, cabin_h_cm, cabin_weight_kg,
        personal_l_cm, personal_w_cm, personal_h_cm,
        checked_weight_kg, checked_dim_total_cm, liquids_ml,
        lithium_wh_installed_max, lithium_wh_spare_max, lithium_spare_qty_max,
        notes, source_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(carrier_iata) DO UPDATE SET
       carrier_name=excluded.carrier_name, alliance=excluded.alliance,
       cabin_l_cm=excluded.cabin_l_cm, cabin_w_cm=excluded.cabin_w_cm, cabin_h_cm=excluded.cabin_h_cm,
       cabin_weight_kg=excluded.cabin_weight_kg,
       personal_l_cm=excluded.personal_l_cm, personal_w_cm=excluded.personal_w_cm, personal_h_cm=excluded.personal_h_cm,
       checked_weight_kg=excluded.checked_weight_kg, checked_dim_total_cm=excluded.checked_dim_total_cm,
       liquids_ml=excluded.liquids_ml,
       lithium_wh_installed_max=excluded.lithium_wh_installed_max,
       lithium_wh_spare_max=excluded.lithium_wh_spare_max,
       lithium_spare_qty_max=excluded.lithium_spare_qty_max,
       notes=excluded.notes, source_url=excluded.source_url, updated_at=datetime('now')`,
  );
  const tx = db.transaction((data: AirlineSeed[]) => {
    for (const r of data) {
      stmt.run(
        r.carrier_iata.toUpperCase(), r.carrier_name, r.alliance ?? null,
        r.cabin_l_cm ?? null, r.cabin_w_cm ?? null, r.cabin_h_cm ?? null, r.cabin_weight_kg ?? null,
        r.personal_l_cm ?? null, r.personal_w_cm ?? null, r.personal_h_cm ?? null,
        r.checked_weight_kg ?? null, r.checked_dim_total_cm ?? null,
        r.liquids_ml ?? 100,
        r.lithium_wh_installed_max ?? null, r.lithium_wh_spare_max ?? null, r.lithium_spare_qty_max ?? null,
        r.notes ?? null, r.source_url ?? null,
      );
    }
  });
  tx(rows);
  console.log(`✓ Airline rules: ${rows.length}`);
  return rows.length;
}

// ─ OPSEC ────────────────────────────────────────────────────────────────────
interface OpsecSeed {
  id: string;
  phase: string;
  category?: string;
  threat_tier_min?: number;
  label: string;
  description?: string;
  source_url?: string;
  sort_order?: number;
}

function importOpsec(db: Db): number {
  const path = resolve("data/templates/opsec.json");
  const rows = JSON.parse(readFileSync(path, "utf8")) as OpsecSeed[];
  const stmt = db.prepare(
    `INSERT INTO opsec_templates
       (id, phase, category, threat_tier_min, label, description, source_url, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       phase=excluded.phase, category=excluded.category, threat_tier_min=excluded.threat_tier_min,
       label=excluded.label, description=excluded.description,
       source_url=excluded.source_url, sort_order=excluded.sort_order`,
  );
  const tx = db.transaction((data: OpsecSeed[]) => {
    for (const r of data) {
      stmt.run(
        r.id, r.phase, r.category ?? null, r.threat_tier_min ?? 0,
        r.label, r.description ?? null, r.source_url ?? null, r.sort_order ?? 0,
      );
    }
  });
  tx(rows);
  console.log(`✓ OPSEC templates: ${rows.length}`);
  return rows.length;
}

// ─ Documents ────────────────────────────────────────────────────────────────
interface DocSeed {
  id: string;
  kind: "universal" | "country" | "transit";
  iso2?: string;
  category: string;
  label: string;
  description?: string;
  when_required?: string;
  fee?: string;
  processing?: string;
  source_url?: string;
  sort_order?: number;
}

function importDocs(db: Db): number {
  const path = resolve("data/templates/documents.json");
  const rows = JSON.parse(readFileSync(path, "utf8")) as DocSeed[];
  const stmt = db.prepare(
    `INSERT INTO document_templates
       (id, kind, iso2, category, label, description, when_required, fee, processing, source_url, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       kind=excluded.kind, iso2=excluded.iso2, category=excluded.category,
       label=excluded.label, description=excluded.description, when_required=excluded.when_required,
       fee=excluded.fee, processing=excluded.processing,
       source_url=excluded.source_url, sort_order=excluded.sort_order`,
  );
  const tx = db.transaction((data: DocSeed[]) => {
    for (const r of data) {
      stmt.run(
        r.id, r.kind, r.iso2 ?? null, r.category, r.label,
        r.description ?? null, r.when_required ?? null,
        r.fee ?? null, r.processing ?? null,
        r.source_url ?? null, r.sort_order ?? 0,
      );
    }
  });
  tx(rows);
  console.log(`✓ Document templates: ${rows.length}`);
  return rows.length;
}

async function main() {
  const db = getDb();
  const pCount = importPacking(db);
  const aCount = importAirlines(db);
  const oCount = importOpsec(db);
  const dCount = importDocs(db);
  recordSource(db, { id: "packing-bundle", name: "Greyline packing templates", license: "AGPL-3.0", url: "data/templates/packing.json", category: "templates", rowCount: pCount });
  recordSource(db, { id: "airline-rules-bundle", name: "Greyline airline rules (IATA/FAA-derived)", license: "AGPL-3.0", url: "data/templates/airlines.json", category: "templates", rowCount: aCount });
  recordSource(db, { id: "opsec-bundle", name: "Greyline OPSEC templates (EFF SSD, CPJ, GIJN-derived)", license: "AGPL-3.0", url: "data/templates/opsec.json", category: "templates", rowCount: oCount });
  recordSource(db, { id: "documents-bundle", name: "Greyline document templates (WHO/CDC/AAA-derived)", license: "AGPL-3.0", url: "data/templates/documents.json", category: "templates", rowCount: dCount });
  closeDb();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
