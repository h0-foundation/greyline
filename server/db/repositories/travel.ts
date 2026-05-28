import { getDb } from '../index';

/** Inclusive day-count between two ISO dates; null/!parseable → 1 (a visit). */
function dayspan(a: string | null, b: string | null): number {
  if (!a) return 1;
  const start = Date.parse(a);
  const end = b ? Date.parse(b) : start;
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

export interface VisitedCountry {
  country_code: string;
  name: string;
  region: string;
  flag: string;
  trips: number;
  days: number;
  first: string | null;
  last: string | null;
}

interface DestRow {
  country_code: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  trip_id: string;
  rest_countries: string | null;
}

/** Aggregate every logged destination into per-country visit stats. */
export function getVisitedCountries(): VisitedCountry[] {
  const rows = getDb().prepare(
    `SELECT d.country_code, d.arrival_date, d.departure_date, d.trip_id, c.rest_countries
       FROM destinations d
       LEFT JOIN country_profiles c ON c.country_code = d.country_code
      WHERE d.country_code IS NOT NULL AND d.country_code != ''`,
  ).all() as DestRow[];

  const map = new Map<string, VisitedCountry & { tripIds: Set<string> }>();
  for (const r of rows) {
    const cc = r.country_code!;
    let entry = map.get(cc);
    if (!entry) {
      let name = cc, region = "Unknown", flag = "";
      if (r.rest_countries) {
        try {
          const rc = JSON.parse(r.rest_countries);
          name = rc?.name?.common ?? cc;
          region = rc?.region ?? "Unknown";
          flag = rc?.flag ?? "";
        } catch { /* keep defaults */ }
      }
      entry = { country_code: cc, name, region, flag, trips: 0, days: 0, first: null, last: null, tripIds: new Set() };
      map.set(cc, entry);
    }
    entry.tripIds.add(r.trip_id);
    entry.days += dayspan(r.arrival_date, r.departure_date);
    const d = r.arrival_date ?? r.departure_date;
    if (d) {
      if (!entry.first || d < entry.first) entry.first = d;
      const last = r.departure_date ?? r.arrival_date!;
      if (!entry.last || last > entry.last) entry.last = last;
    }
  }

  return [...map.values()]
    .map(({ tripIds, ...c }) => ({ ...c, trips: tripIds.size }))
    .sort((a, b) => b.days - a.days);
}

export interface YearInReview {
  year: number;
  trips: number;
  days: number;
  countries: { code: string; name: string; flag: string; days: number; isNew: boolean }[];
  newCountries: number;
  busiestMonth: { month: number; days: number } | null;
  longestTrip: { name: string; days: number; tripId: string } | null;
  farthest: { name: string; flag: string } | null;
  hasData: boolean;
}

/** Narrative recap of a single year — the "Greyline Wrapped" retention hook.
 *  Computed entirely from local trip/destination rows. Pass null → latest year. */
export function getYearInReview(year?: number | null): YearInReview {
  const db = getDb();
  const trips = db.prepare(
    `SELECT t.id, t.name, t.start_date, t.end_date FROM trips t`,
  ).all() as { id: string; name: string; start_date: string | null; end_date: string | null }[];

  // Resolve target year: explicit, else the most recent year with a dated trip.
  const yearsWithData = new Set<number>();
  for (const t of trips) {
    const d = t.start_date ?? t.end_date;
    if (!d) continue;
    const y = new Date(d).getUTCFullYear();
    if (!Number.isNaN(y)) yearsWithData.add(y);
  }
  const target = year ?? (yearsWithData.size ? Math.max(...yearsWithData) : null);
  if (target === null) {
    return { year: new Date().getUTCFullYear(), trips: 0, days: 0, countries: [], newCountries: 0, busiestMonth: null, longestTrip: null, farthest: null, hasData: false };
  }

  // Earliest visit date per country across all trips (to flag first-ever this year).
  const firstSeen = new Map<string, string>();
  const destRows = db.prepare(
    `SELECT d.country_code, d.arrival_date, d.departure_date, d.trip_id, c.rest_countries
       FROM destinations d
       LEFT JOIN country_profiles c ON c.country_code = d.country_code
      WHERE d.country_code IS NOT NULL AND d.country_code != ''`,
  ).all() as DestRow[];
  for (const r of destRows) {
    const d = r.arrival_date ?? r.departure_date;
    if (!d || !r.country_code) continue;
    const prev = firstSeen.get(r.country_code);
    if (!prev || d < prev) firstSeen.set(r.country_code, d);
  }

  const tripById = new Map(trips.map((t) => [t.id, t]));
  const inYear = (d: string | null) => d != null && new Date(d).getUTCFullYear() === target;

  const countries = new Map<string, { code: string; name: string; flag: string; days: number; isNew: boolean }>();
  const months = new Map<number, number>();
  for (const r of destRows) {
    const t = tripById.get(r.trip_id);
    const d = r.arrival_date ?? r.departure_date ?? t?.start_date ?? null;
    if (!inYear(d)) continue;
    const cc = r.country_code!;
    let name = cc, flag = "";
    if (r.rest_countries) {
      try { const rc = JSON.parse(r.rest_countries); name = rc?.name?.common ?? cc; flag = rc?.flag ?? ""; } catch { /* keep */ }
    }
    const days = dayspan(r.arrival_date, r.departure_date);
    const entry = countries.get(cc) ?? { code: cc, name, flag, days: 0, isNew: false };
    entry.days += days;
    const fs = firstSeen.get(cc);
    if (fs && new Date(fs).getUTCFullYear() === target) entry.isNew = true;
    countries.set(cc, entry);
    if (d) {
      const m = new Date(d).getUTCMonth();
      months.set(m, (months.get(m) ?? 0) + days);
    }
  }

  let tripsInYear = 0, daysInYear = 0;
  let longestTrip: YearInReview["longestTrip"] = null;
  for (const t of trips) {
    const d = t.start_date ?? t.end_date;
    if (!inYear(d)) continue;
    tripsInYear++;
    const td = dayspan(t.start_date, t.end_date);
    daysInYear += td;
    if (!longestTrip || td > longestTrip.days) longestTrip = { name: t.name, days: td, tripId: t.id };
  }

  let busiestMonth: YearInReview["busiestMonth"] = null;
  for (const [month, days] of months) {
    if (!busiestMonth || days > busiestMonth.days) busiestMonth = { month, days };
  }

  const sorted = [...countries.values()].sort((a, b) => b.days - a.days);
  return {
    year: target,
    trips: tripsInYear,
    days: daysInYear,
    countries: sorted,
    newCountries: sorted.filter((c) => c.isNew).length,
    busiestMonth,
    longestTrip,
    farthest: sorted[0] ? { name: sorted[0].name, flag: sorted[0].flag } : null,
    hasData: sorted.length > 0 || tripsInYear > 0,
  };
}

/** Years that have at least one dated trip, newest first — for the Wrapped picker. */
export function getTravelYears(): number[] {
  const rows = getDb().prepare(`SELECT start_date, end_date FROM trips`).all() as { start_date: string | null; end_date: string | null }[];
  const years = new Set<number>();
  for (const r of rows) {
    const d = r.start_date ?? r.end_date;
    if (!d) continue;
    const y = new Date(d).getUTCFullYear();
    if (!Number.isNaN(y)) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

export interface TravelStats {
  countries: number;
  continents: number;
  totalDays: number;
  totalTrips: number;
  pctOfWorld: number;
  mostVisited: VisitedCountry | null;
  firstYear: number | null;
  byYear: { year: number; countries: number; trips: number; days: number }[];
}

const WORLD_COUNTRIES = 195;

export function getTravelStats(): TravelStats {
  const visited = getVisitedCountries();
  const continents = new Set(visited.map((v) => v.region).filter((r) => r && r !== "Unknown")).size;
  const totalDays = visited.reduce((s, v) => s + v.days, 0);

  // Per-year aggregation from trip dates.
  const trips = getDb().prepare(
    `SELECT t.id, t.start_date, t.end_date,
            (SELECT GROUP_CONCAT(DISTINCT d.country_code) FROM destinations d WHERE d.trip_id = t.id) AS ccs
       FROM trips t`,
  ).all() as { id: string; start_date: string | null; end_date: string | null; ccs: string | null }[];

  const years = new Map<number, { countries: Set<string>; trips: number; days: number }>();
  let firstYear: number | null = null;
  for (const t of trips) {
    const d = t.start_date ?? t.end_date;
    if (!d) continue;
    const year = new Date(d).getUTCFullYear();
    if (Number.isNaN(year)) continue;
    firstYear = firstYear === null ? year : Math.min(firstYear, year);
    let y = years.get(year);
    if (!y) { y = { countries: new Set(), trips: 0, days: 0 }; years.set(year, y); }
    y.trips++;
    y.days += dayspan(t.start_date, t.end_date);
    for (const cc of (t.ccs ?? "").split(",").filter(Boolean)) y.countries.add(cc);
  }

  const byYear = [...years.entries()]
    .map(([year, y]) => ({ year, countries: y.countries.size, trips: y.trips, days: y.days }))
    .sort((a, b) => a.year - b.year);

  return {
    countries: visited.length,
    continents,
    totalDays,
    totalTrips: trips.length,
    pctOfWorld: Math.round((visited.length / WORLD_COUNTRIES) * 100),
    mostVisited: visited.slice().sort((a, b) => b.trips - a.trips)[0] ?? null,
    firstYear,
    byYear,
  };
}
