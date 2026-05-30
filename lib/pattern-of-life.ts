/* Pattern-of-life self-audit — turn the user's OWN movement record into a
 * re-identifiability awareness view.
 *
 * Grounded in de Montjoye et al., "Unique in the Crowd" (Nature Sci. Reports
 * 2013): just 4 spatio-temporal points uniquely identify 95% of people in a
 * 1.5M-person dataset, and uniqueness decays only as the ~1/10 power of
 * resolution (coarsening barely helps). This computes the "trace richness" of
 * the user's destinations — distinct (country, month) points, distinctive rare
 * countries, and how coarsening collapses the point set. Pure + offline.
 *
 * HONEST FRAMING (for the UI): this is illustrative of how distinctive YOUR
 * record is — not a literal re-identification probability for your specific
 * case (the paper's bound is over a large population). It is a self-awareness
 * tool over data that never leaves the machine. */

import type { DestinationRow, TripRow } from "@/lib/disclosure";

export type RareCountry = { code: string; name: string; visits: number };

export type PatternOfLife = {
  totalDestinations: number;
  /** destinations with a resolvable date (own arrival, else parent trip start) */
  datedPoints: number;
  distinctCountries: number;
  /** distinct (country, YYYY-MM) tuples — the de Montjoye-style spatio-temporal points */
  spatioTemporalPoints: number;
  /** calendar years spanned by the dated record */
  spanYears: number;
  /** countries visited exactly once — individually the most identifying entries */
  rareCountries: RareCountry[];
  /** distinct-point counts at three granularities (coarser = fewer = less identifying) */
  coarsening: { countryMonth: number; countryOnly: number; yearOnly: number };
};

export type PoLCountryMeta = { name: string };

function monthOf(date: string | null): string | null {
  if (!date || date.length < 7) return null;
  const m = date.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(m) ? m : null;
}

export function computePatternOfLife(
  trips: TripRow[],
  destinations: DestinationRow[],
  countries: Map<string, PoLCountryMeta>,
): PatternOfLife {
  const tripById = new Map(trips.map((t) => [t.id, t]));
  const countryMonth = new Set<string>();
  const countryOnly = new Set<string>();
  const yearOnly = new Set<string>();
  const visitsByCountry = new Map<string, number>();
  const years: number[] = [];
  let totalDestinations = 0;
  let datedPoints = 0;

  for (const d of destinations) {
    const cc = d.country_code?.toUpperCase();
    if (!cc) continue;
    totalDestinations++;
    countryOnly.add(cc);
    visitsByCountry.set(cc, (visitsByCountry.get(cc) ?? 0) + 1);

    const date = d.arrival_date ?? tripById.get(d.trip_id)?.start_date ?? null;
    const month = monthOf(date);
    if (month) {
      datedPoints++;
      countryMonth.add(`${cc}:${month}`);
      const year = month.slice(0, 4);
      yearOnly.add(year);
      years.push(Number(year));
    }
  }

  const rareCountries: RareCountry[] = [...visitsByCountry.entries()]
    .filter(([, n]) => n === 1)
    .map(([code, visits]) => ({ code, name: countries.get(code)?.name ?? code, visits }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const spanYears = years.length ? Math.max(...years) - Math.min(...years) + 1 : 0;

  return {
    totalDestinations,
    datedPoints,
    distinctCountries: countryOnly.size,
    spatioTemporalPoints: countryMonth.size,
    spanYears,
    rareCountries,
    coarsening: {
      countryMonth: countryMonth.size,
      countryOnly: countryOnly.size,
      yearOnly: yearOnly.size,
    },
  };
}
