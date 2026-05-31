import { getDb } from "../index";

// UCDP armed-conflict data, bundled offline (migration 019). Georeferenced
// events feed the map's conflict layer; per-country-year fatality totals feed
// the country dossier trend. No network — derived at build time from the GED.

export interface ConflictEvent {
  lat: number;
  lng: number;
  year: number;
  deaths: number;
  type_of_violence: number; // 1 state-based, 2 non-state, 3 one-sided
  country: string | null;
  conflict_name: string | null;
  date_start: string | null;
}

/** Deadliest recent georeferenced events for the map layer. */
export function getConflictEvents(limit = 5000): ConflictEvent[] {
  return getDb()
    .prepare(
      `SELECT lat, lng, year, deaths, type_of_violence, country, conflict_name, date_start
       FROM ucdp_events ORDER BY deaths DESC LIMIT ?`,
    )
    .all(limit) as ConflictEvent[];
}

export interface ConflictYear { year: number; deaths: number; events: number; }

// UCDP names a handful of countries differently from REST Countries' common
// name. Bridge only the conflict-relevant ones; everything else matches directly
// or via the "<Name> (…)" fallback below.
const UCDP_NAME_ALIASES: Record<string, string> = {
  "United States": "United States of America",
  "DR Congo": "DR Congo (Zaire)",
  "Democratic Republic of the Congo": "DR Congo (Zaire)",
  "Republic of the Congo": "Congo",
  Myanmar: "Myanmar (Burma)",
  Russia: "Russia (Soviet Union)",
  Yemen: "Yemen (North Yemen)",
  Cambodia: "Cambodia (Kampuchea)",
  "North Macedonia": "Macedonia, FYR",
};

/** Recent fatality trend + lifetime total for a country, by REST common name.
 *  Returns null when UCDP has no record (so the dossier hides the section). */
export function getConflictTrend(restName: string, years = 12): { recent: ConflictYear[]; total: number; country: string } | null {
  const db = getDb();
  const exists = db.prepare(`SELECT 1 FROM ucdp_country_year WHERE country = ? LIMIT 1`);
  let country: string | null = null;
  for (const cand of [restName, UCDP_NAME_ALIASES[restName]]) {
    if (cand && exists.get(cand)) { country = cand; break; }
  }
  if (!country) {
    const row = db
      .prepare(`SELECT country FROM ucdp_country_year WHERE country LIKE ? ORDER BY LENGTH(country) LIMIT 1`)
      .get(`${restName} (%`) as { country: string } | undefined;
    if (row) country = row.country;
  }
  if (!country) return null;

  const recent = db
    .prepare(`SELECT year, deaths, events FROM ucdp_country_year WHERE country = ? ORDER BY year DESC LIMIT ?`)
    .all(country, years) as ConflictYear[];
  if (!recent.length) return null;
  const total = (db.prepare(`SELECT SUM(deaths) AS d FROM ucdp_country_year WHERE country = ?`).get(country) as { d: number | null }).d ?? 0;
  return { recent: recent.reverse(), total, country };
}
