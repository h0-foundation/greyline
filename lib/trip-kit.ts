// Pure aggregators: turn the bundled templates into a per-trip plan.
//
//   buildPackingList({ destinations, threat_tier, activities }) → grouped + sorted
//   buildDocChecklist({ destinations, home_iso2 })             → grouped + sorted
//   aggregateAirlineRules(rules)                                → most-restrictive limits

import type {
  PackingTemplate,
  AirlineRule,
  DocTemplate,
  OpsecTemplate,
} from "../server/db/repositories/templates";

// ─ Packing builder ─────────────────────────────────────────────────────────
export type PackingInput = {
  templates: PackingTemplate[];
  threat_tier: number;             // 0..3
  destinations: Array<{
    country_code: string | null;
    // Inferred climate from country lat or curated tags (caller picks).
    climate_tags?: string[];
    activity_tags?: string[];
  }>;
};

export type PackingItem = PackingTemplate & {
  rationale: string;               // why this item showed up for this trip
};

export type PackingGroup = { category: string; items: PackingItem[] };

const CATEGORY_ORDER = ["documents", "money", "electronics", "opsec", "clothing", "health", "ground", "specialty"];

export function buildPackingList(input: PackingInput): PackingGroup[] {
  const climates = new Set<string>();
  const activities = new Set<string>();
  for (const d of input.destinations) {
    for (const c of d.climate_tags ?? []) climates.add(c);
    for (const a of d.activity_tags ?? []) activities.add(a);
  }

  // An item belongs to the list iff:
  //   • threat tier gate is met
  //   • AND (no climate tags  OR  any climate tag matches)
  //   • AND (no activity tags OR any activity tag matches)
  //   • AND (no iso2  OR  the trip visits that country)
  const visitedIsos = new Set(
    input.destinations.map((d) => (d.country_code ?? "").toUpperCase()).filter(Boolean),
  );
  const out: PackingItem[] = [];
  for (const t of input.templates) {
    if (t.threat_tier_min > input.threat_tier) continue;
    if (t.iso2 && !visitedIsos.has(t.iso2.toUpperCase())) continue;
    const climateMatch = t.climate_tags.length === 0 || t.climate_tags.some((c) => climates.has(c));
    const activityMatch = t.activity_tags.length === 0 || t.activity_tags.some((a) => activities.has(a));
    if (!climateMatch || !activityMatch) continue;

    const reasons: string[] = [];
    if (t.iso2) reasons.push(`for ${t.iso2}`);
    const matchedClimate = t.climate_tags.filter((c) => climates.has(c));
    if (matchedClimate.length) reasons.push(matchedClimate.join(" / "));
    const matchedActivity = t.activity_tags.filter((a) => activities.has(a));
    if (matchedActivity.length) reasons.push(matchedActivity.join(" / "));
    if (t.threat_tier_min > 0) reasons.push(`tier ≥ ${t.threat_tier_min}`);

    out.push({ ...t, rationale: reasons.join(" · ") || "core" });
  }

  // Group + sort by canonical category order.
  const byCategory = new Map<string, PackingItem[]>();
  for (const it of out) {
    const list = byCategory.get(it.category) ?? [];
    list.push(it);
    byCategory.set(it.category, list);
  }
  const groups: PackingGroup[] = [];
  for (const cat of CATEGORY_ORDER) {
    if (byCategory.has(cat)) groups.push({ category: cat, items: byCategory.get(cat)! });
  }
  for (const [cat, items] of byCategory) {
    if (!CATEGORY_ORDER.includes(cat)) groups.push({ category: cat, items });
  }
  for (const g of groups) g.items.sort((a, b) => a.sort_order - b.sort_order);
  return groups;
}

// Map a country's lat band (+ optional curated hint) to climate tags.
// Cheap heuristic — keeps the seed bundle small. Tropical zone = |lat| <= 23.5.
export function inferClimateTags(lat: number | null): string[] {
  if (lat == null) return [];
  const abs = Math.abs(lat);
  if (abs <= 23.5) return ["tropical", "hot", "humid"];
  if (abs <= 35) return ["hot", "temperate"];
  if (abs <= 55) return ["temperate"];
  return ["cold"];
}

// ─ Documents builder ───────────────────────────────────────────────────────
export type DocsGroup = { category: string; items: DocTemplate[] };

const DOC_CATEGORY_ORDER = ["visa", "health", "driving", "insurance", "proof_of_funds", "customs", "other"];

export function buildDocChecklist(templates: DocTemplate[]): DocsGroup[] {
  const byCategory = new Map<string, DocTemplate[]>();
  for (const t of templates) {
    const list = byCategory.get(t.category) ?? [];
    list.push(t);
    byCategory.set(t.category, list);
  }
  const groups: DocsGroup[] = [];
  for (const cat of DOC_CATEGORY_ORDER) {
    if (byCategory.has(cat)) groups.push({ category: cat, items: byCategory.get(cat)! });
  }
  for (const [cat, items] of byCategory) {
    if (!DOC_CATEGORY_ORDER.includes(cat)) groups.push({ category: cat, items });
  }
  for (const g of groups) g.items.sort((a, b) => a.sort_order - b.sort_order);
  return groups;
}

// ─ Airline rule aggregator (most-restrictive) ──────────────────────────────
export type TripLimits = {
  cabin_l_cm: number | null;
  cabin_w_cm: number | null;
  cabin_h_cm: number | null;
  cabin_weight_kg: number | null;
  personal_dim: { l: number | null; w: number | null; h: number | null };
  checked_weight_kg: number | null;
  liquids_ml: number;
  lithium_wh_installed_max: number | null;
  lithium_wh_spare_max: number | null;
  source_carrier: string | null;  // which carrier set the tightest cabin limit
};

function minOrNull(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

export function aggregateAirlineRules(rules: AirlineRule[]): TripLimits {
  let tightestCabinVolume = Infinity;
  let tightestCarrier: string | null = null;
  for (const r of rules) {
    const vol =
      (r.cabin_l_cm ?? 999) * (r.cabin_w_cm ?? 999) * (r.cabin_h_cm ?? 999);
    if (vol < tightestCabinVolume) {
      tightestCabinVolume = vol;
      tightestCarrier = r.carrier_name;
    }
  }
  return {
    cabin_l_cm: rules.reduce<number | null>((a, r) => minOrNull(a, r.cabin_l_cm), null),
    cabin_w_cm: rules.reduce<number | null>((a, r) => minOrNull(a, r.cabin_w_cm), null),
    cabin_h_cm: rules.reduce<number | null>((a, r) => minOrNull(a, r.cabin_h_cm), null),
    cabin_weight_kg: rules.reduce<number | null>((a, r) => minOrNull(a, r.cabin_weight_kg), null),
    personal_dim: {
      l: rules.reduce<number | null>((a, r) => minOrNull(a, r.personal_l_cm), null),
      w: rules.reduce<number | null>((a, r) => minOrNull(a, r.personal_w_cm), null),
      h: rules.reduce<number | null>((a, r) => minOrNull(a, r.personal_h_cm), null),
    },
    checked_weight_kg: rules.reduce<number | null>((a, r) => minOrNull(a, r.checked_weight_kg), null),
    liquids_ml: rules.reduce<number>((a, r) => Math.min(a, r.liquids_ml ?? 100), 100),
    lithium_wh_installed_max: rules.reduce<number | null>((a, r) => minOrNull(a, r.lithium_wh_installed_max), null),
    lithium_wh_spare_max: rules.reduce<number | null>((a, r) => minOrNull(a, r.lithium_wh_spare_max), null),
    source_carrier: tightestCarrier,
  };
}

// ─ OPSEC phase grouper ─────────────────────────────────────────────────────
export type OpsecGroup = { phase: string; label: string; items: OpsecTemplate[] };

const PHASE_LABELS: Record<string, string> = {
  "pre-trip": "Pre-trip · digital hygiene",
  "border": "At the border",
  "during": "On the ground",
  "post-trip": "Post-trip",
};
const PHASE_ORDER = ["pre-trip", "border", "during", "post-trip"];

export function groupOpsec(templates: OpsecTemplate[]): OpsecGroup[] {
  const byPhase = new Map<string, OpsecTemplate[]>();
  for (const t of templates) {
    const list = byPhase.get(t.phase) ?? [];
    list.push(t);
    byPhase.set(t.phase, list);
  }
  const groups: OpsecGroup[] = [];
  for (const phase of PHASE_ORDER) {
    if (byPhase.has(phase)) {
      groups.push({ phase, label: PHASE_LABELS[phase], items: byPhase.get(phase)! });
    }
  }
  for (const g of groups) g.items.sort((a, b) => a.sort_order - b.sort_order);
  return groups;
}
