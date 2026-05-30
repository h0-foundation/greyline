// Multi-source travel-advisory aggregator. Each source resolves a country
// (by ISO2) to a normalized 1..4 level + a short summary + a deep-link.
//
// Today: US State Department (existing) + UK FCDO via the gov.uk Content API.
// Future-ready: shape lets us add AU Smartraveller, CA Global Affairs without
// touching downstream callers. All responses cache via proxyFetch.

import { proxyFetch } from "../services/api-gateway";

export type AdvisorySource = "us_state" | "uk_fcdo"; // | 'au_dfat' | 'ca_gac' | …

export interface NormalizedAdvisory {
  iso2: string;
  source: AdvisorySource;
  level: 1 | 2 | 3 | 4;          // 1=normal precautions … 4=do not travel
  level_label: string;
  summary: string;
  url: string;
  updated: string;               // ISO 8601
}

// ── US State Department ──────────────────────────────────────────────────────
// Re-uses the existing single-source endpoint, normalized to the new shape.
import { getTravelAdvisories } from "./travel-advisory";

const US_LABEL: Record<number, string> = {
  1: "Exercise normal precautions",
  2: "Exercise increased caution",
  3: "Reconsider travel",
  4: "Do not travel",
};

export async function fetchUsState(
  iso3to2: Map<string, string>,
  nameToIso2: Map<string, string>,
): Promise<NormalizedAdvisory[]> {
  const data = await getTravelAdvisories();
  if (!data) return [];
  function nameKey(s: string): string {
    return s.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }
  const out: NormalizedAdvisory[] = [];
  for (const entry of Object.values(data)) {
    // First try the ISO3 the existing client scraped from the URL; if missing
    // fall back to matching by the title's country name.
    let iso2 = entry.iso_alpha2 ? iso3to2.get(entry.iso_alpha2.toUpperCase()) : undefined;
    if (!iso2 && entry.name) iso2 = nameToIso2.get(nameKey(entry.name));
    if (!iso2) continue;
    const lvl = Math.max(1, Math.min(4, Math.round(entry.advisory.score))) as 1 | 2 | 3 | 4;
    out.push({
      iso2,
      source: "us_state",
      level: lvl,
      level_label: US_LABEL[lvl],
      summary: entry.advisory.message || US_LABEL[lvl],
      url: `https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html`,
      updated: entry.advisory.updated || new Date().toISOString(),
    });
  }
  return out;
}

// ── UK FCDO (gov.uk Content API) ─────────────────────────────────────────────
//
// `https://www.gov.uk/api/content/foreign-travel-advice/<slug>` returns a rich
// JSON document. The risk lives in `details.alert_status` (string[]). Empty/null
// = no advisory; presence indicates avoid_* directives we map to 1..4.

interface FcdoContent {
  title?: string;
  description?: string;
  base_path?: string;
  public_updated_at?: string;
  updated_at?: string;
  details?: {
    alert_status?: string[] | null;
    change_description?: string | null;
    parts?: Array<{ title?: string; body?: string }>;
    country?: { name?: string };
  };
}

const FCDO_SLUG_OVERRIDES: Record<string, string> = {
  // gov.uk slugs deviate from REST Countries common names in a handful of cases.
  US: "usa",
  GB: "united-kingdom",
  CD: "democratic-republic-of-the-congo",
  CG: "congo",
  KP: "north-korea",
  KR: "south-korea",
  MK: "north-macedonia",
  CI: "cote-d-ivoire",
  CV: "cape-verde",
  CZ: "czech-republic",
  SZ: "eswatini",
  PS: "the-occupied-palestinian-territories",
  VG: "british-virgin-islands",
  VI: "us-virgin-islands",
  AE: "united-arab-emirates",
  TL: "east-timor",
};

function commonNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/'/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeFcdoLevel(alert?: string[] | null): { level: 1 | 2 | 3 | 4; label: string } {
  if (!alert || alert.length === 0) return { level: 1, label: "See FCDO advice" };
  const flat = alert.join(" ");
  if (/avoid_all_travel(_to_whole_country)?$/.test(flat))
    return { level: 4, label: "Advise against all travel" };
  if (/avoid_all_but_essential_travel(_to_whole_country)?$/.test(flat) || /avoid_all_but_essential_travel$/.test(flat))
    return { level: 3, label: "Advise against all but essential travel" };
  if (/avoid_all_but_essential_travel_to_parts/.test(flat))
    return { level: 2, label: "Advise against all but essential travel to parts" };
  if (/avoid_all_travel_to_parts/.test(flat))
    return { level: 2, label: "Advise against all travel to parts" };
  return { level: 1, label: "See FCDO advice" };
}

function firstSentence(body: string): string {
  const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const m = text.match(/^(.{40,260}?[.!?])\s/);
  return (m ? m[1] : text.slice(0, 220)).trim();
}

async function fetchOneFcdo(slug: string): Promise<FcdoContent | null> {
  try {
    const result = await proxyFetch<FcdoContent>({
      apiId: "uk-fcdo",
      url: `https://www.gov.uk/api/content/foreign-travel-advice/${slug}`,
      cacheTtlSeconds: 86400,
    });
    return result?.data ?? null;
  } catch (_e) {
    // gov.uk returns 404 for countries with no FCDO advice (Vatican, some
    // microstates). Treat that as "no advisory" rather than failing the run.
    return null;
  }
}

export async function fetchUkFcdo(
  iso2: string,
  commonName: string,
): Promise<NormalizedAdvisory | null> {
  const slug = FCDO_SLUG_OVERRIDES[iso2.toUpperCase()] ?? commonNameToSlug(commonName);
  const data = await fetchOneFcdo(slug);
  if (!data) return null;
  const det = data.details ?? {};
  const { level, label } = normalizeFcdoLevel(det.alert_status);
  // Build a summary: prefer change_description, else first sentence of part 1.
  const change = (det.change_description ?? "").trim();
  const part1 = det.parts?.[0]?.body ?? "";
  const summary = change || (part1 ? firstSentence(part1) : data.description || label);
  return {
    iso2: iso2.toUpperCase(),
    source: "uk_fcdo",
    level,
    level_label: label,
    summary: summary.slice(0, 500),
    url: `https://www.gov.uk${data.base_path ?? `/foreign-travel-advice/${slug}`}`,
    updated: data.public_updated_at || data.updated_at || new Date().toISOString(),
  };
}
