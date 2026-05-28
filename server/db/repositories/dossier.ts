// Read-only helpers for the per-country dossier (indices + multi-source
// advisories + CIA World Factbook). Populated by `pnpm build:dossier` and
// `pnpm build:advisories`; nothing here reaches the network.

import { getDb } from "../index";

export interface CountryIndices {
  iso2: string;
  cpi_score: number | null;
  cpi_year: number | null;
  rsf_score: number | null;
  rsf_rank: number | null;
  rsf_year: number | null;
  fsi_score: number | null;
  fsi_year: number | null;
  gpi_score: number | null;
  gpi_rank: number | null;
  gpi_year: number | null;
  visa_free_count: number | null;
  visa_free_year: number | null;
}

export type AdvisorySource = "us_state" | "uk_fcdo" | "au_dfat" | "ca_gac";

export interface AdvisoryRow {
  iso2: string;
  source: AdvisorySource;
  level: 1 | 2 | 3 | 4;
  level_label: string;
  summary: string;
  url: string;
  updated: string;
  fetched_at: string;
}

export interface FactbookRow {
  iso2: string;
  gec_code: string | null;
  data: string;
  updated_at: string;
}

export function getCountryIndices(iso2: string): CountryIndices | undefined {
  return getDb()
    .prepare("SELECT * FROM country_indices WHERE iso2 = ?")
    .get(iso2.toUpperCase()) as CountryIndices | undefined;
}

export function getAllIndices(): CountryIndices[] {
  return getDb().prepare("SELECT * FROM country_indices").all() as CountryIndices[];
}

export function getAdvisoriesByCountry(iso2: string): AdvisoryRow[] {
  return getDb()
    .prepare("SELECT * FROM country_advisories WHERE iso2 = ? ORDER BY source")
    .all(iso2.toUpperCase()) as AdvisoryRow[];
}

/**
 * One advisory per country, picking the most severe across sources. Used for
 * the `/countries` browser column and the trip briefing roll-up.
 */
export interface PeakAdvisory {
  iso2: string;
  level: number;
  level_label: string;
  source: AdvisorySource;
  sources_count: number;   // how many sources have anything to say
  summary: string;
  url: string;
  updated: string;
}

export function getPeakAdvisories(): Map<string, PeakAdvisory> {
  const rows = getDb()
    .prepare("SELECT * FROM country_advisories")
    .all() as AdvisoryRow[];
  const byIso = new Map<string, AdvisoryRow[]>();
  for (const r of rows) {
    const list = byIso.get(r.iso2) ?? [];
    list.push(r);
    byIso.set(r.iso2, list);
  }
  const out = new Map<string, PeakAdvisory>();
  for (const [iso2, list] of byIso) {
    const peak = list.reduce((a, b) => (b.level > a.level ? b : a));
    out.set(iso2, {
      iso2,
      level: peak.level,
      level_label: peak.level_label,
      source: peak.source,
      sources_count: list.length,
      summary: peak.summary,
      url: peak.url,
      updated: peak.updated,
    });
  }
  return out;
}

export function getFactbookByCountry(iso2: string): FactbookRow | undefined {
  return getDb()
    .prepare("SELECT * FROM country_factbook WHERE iso2 = ?")
    .get(iso2.toUpperCase()) as FactbookRow | undefined;
}

// ── Lightweight Factbook decoder ────────────────────────────────────────────
// Factbook stores deep nested objects with "{ text: ... }" leaves. Pull only
// the high-value fields the dossier UI needs.

export interface FactbookHighlights {
  background: string | null;
  government: {
    countryName: string | null;
    governmentType: string | null;
    capital: string | null;
    independence: string | null;
    constitution: string | null;
    legalSystem: string | null;
    suffrage: string | null;
  };
  economy: {
    overview: string | null;
    gdpPerCapita: string | null;
    gini: string | null;
    unemployment: string | null;
    inflation: string | null;
    laborForce: string | null;
  };
  people: {
    population: string | null;
    languages: string | null;
    religions: string | null;
    medianAge: string | null;
    lifeExpectancy: string | null;
    literacy: string | null;
  };
  comms: {
    internetCountryCode: string | null;
    internetUsers: string | null;
  };
  transport: {
    airports: string | null;
    railways: string | null;
    roadways: string | null;
  };
  military: {
    serviceBranches: string | null;
    expenditure: string | null;
  };
}

type AnyObj = Record<string, unknown>;
function leaf(o: unknown, ...path: string[]): string | null {
  let cur: unknown = o;
  for (const p of path) {
    if (!cur || typeof cur !== "object") return null;
    cur = (cur as AnyObj)[p];
  }
  if (!cur) return null;
  if (typeof cur === "string") return cur;
  if (typeof cur === "object" && cur !== null && "text" in cur && typeof (cur as { text?: unknown }).text === "string") {
    return (cur as { text: string }).text;
  }
  return null;
}

export function decodeFactbook(json: string): FactbookHighlights | null {
  let d: AnyObj;
  try { d = JSON.parse(json) as AnyObj; } catch { return null; }
  return {
    background: leaf(d, "Introduction", "Background"),
    government: {
      countryName: leaf(d, "Government", "Country name", "conventional short form"),
      governmentType: leaf(d, "Government", "Government type"),
      capital: leaf(d, "Government", "Capital", "name"),
      independence: leaf(d, "Government", "Independence"),
      constitution: leaf(d, "Government", "Constitution", "history"),
      legalSystem: leaf(d, "Government", "Legal system"),
      suffrage: leaf(d, "Government", "Suffrage"),
    },
    economy: {
      overview: leaf(d, "Economy", "Economic overview"),
      gdpPerCapita: leaf(d, "Economy", "Real GDP per capita"),
      gini: leaf(d, "Economy", "Gini Index coefficient - distribution of family income"),
      unemployment: leaf(d, "Economy", "Unemployment rate"),
      inflation: leaf(d, "Economy", "Inflation rate (consumer prices)"),
      laborForce: leaf(d, "Economy", "Labor force"),
    },
    people: {
      population: leaf(d, "People and Society", "Population", "total"),
      languages: leaf(d, "People and Society", "Languages"),
      religions: leaf(d, "People and Society", "Religions"),
      medianAge: leaf(d, "People and Society", "Median age", "total"),
      lifeExpectancy: leaf(d, "People and Society", "Life expectancy at birth", "total population"),
      literacy: leaf(d, "People and Society", "Literacy", "total population"),
    },
    comms: {
      internetCountryCode: leaf(d, "Communications", "Internet country code"),
      internetUsers: leaf(d, "Communications", "Internet users", "percent of population"),
    },
    transport: {
      airports: leaf(d, "Transportation", "National air transport system", "number of registered air carriers"),
      railways: leaf(d, "Transportation", "Railways", "total"),
      roadways: leaf(d, "Transportation", "Roadways", "total"),
    },
    military: {
      serviceBranches: leaf(d, "Military and Security", "Military and security forces"),
      expenditure: leaf(d, "Military and Security", "Military expenditures"),
    },
  };
}
