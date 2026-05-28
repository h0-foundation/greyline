// Read helpers for the bundled trip-planning templates. All synchronous —
// reads happen against the local SQLite at request time.

import { getDb } from "../index";

// ─ Types ──────────────────────────────────────────────────────────────────
export interface PackingTemplate {
  id: string;
  category: string;
  label: string;
  description: string | null;
  climate_tags: string[];     // decoded JSON
  activity_tags: string[];    // decoded JSON
  threat_tier_min: number;
  iso2: string | null;
  optional: boolean;
  source_url: string | null;
  sort_order: number;
}

export interface AirlineRule {
  carrier_iata: string;
  carrier_name: string;
  alliance: string | null;
  cabin_l_cm: number | null;
  cabin_w_cm: number | null;
  cabin_h_cm: number | null;
  cabin_weight_kg: number | null;
  personal_l_cm: number | null;
  personal_w_cm: number | null;
  personal_h_cm: number | null;
  checked_weight_kg: number | null;
  checked_dim_total_cm: number | null;
  liquids_ml: number;
  lithium_wh_installed_max: number | null;
  lithium_wh_spare_max: number | null;
  lithium_spare_qty_max: number | null;
  notes: string | null;
  source_url: string | null;
}

export interface OpsecTemplate {
  id: string;
  phase: "pre-trip" | "border" | "during" | "post-trip";
  category: string | null;
  threat_tier_min: number;
  label: string;
  description: string | null;
  source_url: string | null;
  sort_order: number;
}

export interface DocTemplate {
  id: string;
  kind: "universal" | "country" | "transit";
  iso2: string | null;
  category: string;
  label: string;
  description: string | null;
  when_required: string | null;
  fee: string | null;
  processing: string | null;
  source_url: string | null;
  sort_order: number;
}

// ─ Packing ─────────────────────────────────────────────────────────────────
type RawPacking = {
  id: string; category: string; label: string; description: string | null;
  climate_tags: string; activity_tags: string; threat_tier_min: number;
  iso2: string | null; optional: number; source_url: string | null; sort_order: number;
};

function decodePacking(r: RawPacking): PackingTemplate {
  return {
    ...r,
    optional: r.optional === 1,
    climate_tags: parseTags(r.climate_tags),
    activity_tags: parseTags(r.activity_tags),
  };
}

function parseTags(s: string): string[] {
  try { return JSON.parse(s) as string[]; } catch { return []; }
}

export function getPackingTemplates(): PackingTemplate[] {
  const rows = getDb()
    .prepare("SELECT * FROM packing_templates ORDER BY category, sort_order, label")
    .all() as RawPacking[];
  return rows.map(decodePacking);
}

export function getPackingTemplatesForCountries(iso2s: string[]): PackingTemplate[] {
  if (iso2s.length === 0) return [];
  const placeholders = iso2s.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT * FROM packing_templates WHERE iso2 IN (${placeholders})`)
    .all(...iso2s.map((s) => s.toUpperCase())) as RawPacking[];
  return rows.map(decodePacking);
}

// ─ Airlines ────────────────────────────────────────────────────────────────
export function getAirlineRule(iata: string): AirlineRule | undefined {
  return getDb()
    .prepare("SELECT * FROM airline_rules WHERE carrier_iata = ?")
    .get(iata.toUpperCase()) as AirlineRule | undefined;
}

export function getAirlineRules(iatas: string[]): AirlineRule[] {
  if (iatas.length === 0) return [];
  const placeholders = iatas.map(() => "?").join(",");
  return getDb()
    .prepare(`SELECT * FROM airline_rules WHERE carrier_iata IN (${placeholders})`)
    .all(...iatas.map((s) => s.toUpperCase())) as AirlineRule[];
}

export function getAllAirlineRules(): AirlineRule[] {
  return getDb()
    .prepare("SELECT * FROM airline_rules ORDER BY carrier_name")
    .all() as AirlineRule[];
}

// ─ OPSEC ───────────────────────────────────────────────────────────────────
export function getOpsecTemplates(filter?: { phase?: string; tier_max?: number }): OpsecTemplate[] {
  let sql = "SELECT * FROM opsec_templates WHERE 1=1";
  const args: (string | number)[] = [];
  if (filter?.phase) { sql += " AND phase = ?"; args.push(filter.phase); }
  if (filter?.tier_max != null) { sql += " AND threat_tier_min <= ?"; args.push(filter.tier_max); }
  sql += " ORDER BY phase, sort_order, label";
  return getDb().prepare(sql).all(...args) as OpsecTemplate[];
}

// ─ Documents ───────────────────────────────────────────────────────────────
export function getDocTemplates(filter: { iso2s: string[] }): DocTemplate[] {
  const db = getDb();
  const universal = db
    .prepare("SELECT * FROM document_templates WHERE kind = 'universal' ORDER BY sort_order, label")
    .all() as DocTemplate[];
  if (filter.iso2s.length === 0) return universal;
  const placeholders = filter.iso2s.map(() => "?").join(",");
  const country = db
    .prepare(`SELECT * FROM document_templates
                WHERE kind IN ('country','transit') AND iso2 IN (${placeholders})
                ORDER BY sort_order, label`)
    .all(...filter.iso2s.map((s) => s.toUpperCase())) as DocTemplate[];
  return [...universal, ...country];
}
