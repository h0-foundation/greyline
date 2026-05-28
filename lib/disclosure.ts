/**
 * Disclosure-grade foreign-travel report.
 *
 * Mirrors the US SF-86 Section 20C definition (foreign travel within the past
 * 7 years), plus a lifetime country tally. Pure computation — no DB or
 * network access here; the page passes in already-loaded rows. This file is
 * the single source of truth for the format.
 *
 * Not a filed government form. Personal record only.
 */

export type DisclosureEntry = {
  trip_id: string;
  trip_name: string;
  country_code: string;
  country_name: string;
  region: string;
  arrival: string | null;
  departure: string | null;
  days: number;
  notes: string | null;
};

export type CountrySummary = {
  country_code: string;
  country_name: string;
  region: string;
  first_visit: string | null;
  last_visit: string | null;
  total_trips: number;
  total_days: number;
};

export type DisclosureReport = {
  generated_at: string;
  home_country: string | null;
  window: { start: string; end: string; years: number };
  foreign_travel: DisclosureEntry[];
  lifetime_countries: CountrySummary[];
  stats: {
    total_foreign_trips_in_window: number;
    total_foreign_days_in_window: number;
    countries_visited_in_window: number;
    countries_visited_lifetime: number;
  };
};

export type TripRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
};

export type DestinationRow = {
  id: string;
  trip_id: string;
  country_code: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  notes: string | null;
};

export type CountryMeta = { name: string; region: string };

const DAY_MS = 86_400_000;

function dayspan(a: string | null, b: string | null): number {
  if (!a) return 1;
  const start = Date.parse(a);
  const end = b ? Date.parse(b) : start;
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / DAY_MS) + 1);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeDisclosure(
  trips: TripRow[],
  destinations: DestinationRow[],
  countries: Map<string, CountryMeta>,
  homeCountry: string | null,
  asOf: Date = new Date(),
): DisclosureReport {
  const home = (homeCountry ?? "").toUpperCase();
  const windowEnd = asOf;
  const windowStart = new Date(windowEnd);
  windowStart.setUTCFullYear(windowEnd.getUTCFullYear() - 7);
  const windowStartIso = isoDate(windowStart);
  const windowEndIso = isoDate(windowEnd);
  const tripById = new Map(trips.map((t) => [t.id, t]));

  const entries: DisclosureEntry[] = [];
  const lifetimeMap = new Map<string, CountrySummary & { tripIds: Set<string> }>();

  for (const d of destinations) {
    const cc = d.country_code?.toUpperCase();
    if (!cc) continue;
    const trip = tripById.get(d.trip_id);
    if (!trip) continue;
    // Foreign-only — exclude the home country from disclosure entries.
    if (home && cc === home) continue;

    const meta = countries.get(cc);
    const country_name = meta?.name ?? cc;
    const region = meta?.region ?? "Unknown";

    // Date resolution: prefer the destination's own arrival/departure; fall
    // back to the parent trip's dates so undated destinations still count.
    const arrival = d.arrival_date ?? trip.start_date;
    const departure = d.departure_date ?? d.arrival_date ?? trip.end_date ?? trip.start_date;
    const days = dayspan(arrival, departure);

    // Lifetime — every foreign destination, all years.
    let life = lifetimeMap.get(cc);
    if (!life) {
      life = {
        country_code: cc,
        country_name,
        region,
        first_visit: null,
        last_visit: null,
        total_trips: 0,
        total_days: 0,
        tripIds: new Set(),
      };
      lifetimeMap.set(cc, life);
    }
    life.tripIds.add(d.trip_id);
    life.total_days += days;
    if (arrival && (!life.first_visit || arrival < life.first_visit)) life.first_visit = arrival;
    const last = departure ?? arrival;
    if (last && (!life.last_visit || last > life.last_visit)) life.last_visit = last;

    // Window — disclosure entries within the past 7 years (use arrival anchor).
    if (arrival && arrival >= windowStartIso && arrival <= windowEndIso) {
      entries.push({
        trip_id: trip.id,
        trip_name: trip.name,
        country_code: cc,
        country_name,
        region,
        arrival,
        departure,
        days,
        notes: d.notes ?? trip.notes,
      });
    }
  }

  // Most-recent first for entries; days-desc for the lifetime tally.
  entries.sort((a, b) => (b.arrival ?? "").localeCompare(a.arrival ?? ""));
  const lifetime: CountrySummary[] = [...lifetimeMap.values()]
    .map(({ tripIds, ...c }) => ({ ...c, total_trips: tripIds.size }))
    .sort((a, b) => b.total_days - a.total_days);

  const stats = {
    total_foreign_trips_in_window: new Set(entries.map((e) => e.trip_id)).size,
    total_foreign_days_in_window: entries.reduce((s, e) => s + e.days, 0),
    countries_visited_in_window: new Set(entries.map((e) => e.country_code)).size,
    countries_visited_lifetime: lifetime.length,
  };

  return {
    generated_at: asOf.toISOString(),
    home_country: home || null,
    window: { start: windowStartIso, end: windowEndIso, years: 7 },
    foreign_travel: entries,
    lifetime_countries: lifetime,
    stats,
  };
}

/** Markdown export — readable, table-driven, mirrors the SF-86-style logbook. */
export function toMarkdown(r: DisclosureReport): string {
  const lines: string[] = [];
  lines.push(`# Foreign Travel — Disclosure-grade Report`);
  lines.push("");
  lines.push(
    `> Generated **${r.generated_at.slice(0, 10)}** from your local Greyline logbook. Nothing left your machine. This is a personal record; not a filed government form.`,
  );
  lines.push("");
  lines.push(`- Home country: \`${r.home_country ?? "(not set)"}\``);
  lines.push(`- Window: \`${r.window.start}\` → \`${r.window.end}\` (${r.window.years} years)`);
  lines.push(`- Foreign trips in window: **${r.stats.total_foreign_trips_in_window}**`);
  lines.push(`- Foreign days in window: **${r.stats.total_foreign_days_in_window}**`);
  lines.push(`- Countries in window: **${r.stats.countries_visited_in_window}**`);
  lines.push(`- Lifetime foreign countries: **${r.stats.countries_visited_lifetime}**`);
  lines.push("");
  lines.push(`## Foreign travel — past ${r.window.years} years`);
  lines.push("");
  if (r.foreign_travel.length === 0) {
    lines.push(`_No foreign travel within the disclosure window._`);
  } else {
    lines.push(`| Country | Code | Region | Arrival | Departure | Days | Trip |`);
    lines.push(`|---|---|---|---|---|---:|---|`);
    for (const e of r.foreign_travel) {
      lines.push(
        `| ${e.country_name} | \`${e.country_code}\` | ${e.region} | \`${e.arrival ?? "—"}\` | \`${e.departure ?? "—"}\` | ${e.days} | ${e.trip_name} |`,
      );
    }
  }
  lines.push("");
  lines.push(`## Lifetime country summary`);
  lines.push("");
  if (r.lifetime_countries.length === 0) {
    lines.push(`_No foreign travel on record._`);
  } else {
    lines.push(`| Country | Code | Region | First | Last | Trips | Days |`);
    lines.push(`|---|---|---|---|---|---:|---:|`);
    for (const c of r.lifetime_countries) {
      lines.push(
        `| ${c.country_name} | \`${c.country_code}\` | ${c.region} | \`${c.first_visit ?? "—"}\` | \`${c.last_visit ?? "—"}\` | ${c.total_trips} | ${c.total_days} |`,
      );
    }
  }
  lines.push("");
  lines.push(`---`);
  lines.push(`Generated by Greyline (AGPL-3.0) at ${r.generated_at}.`);
  return lines.join("\n");
}

/** Machine-readable export — for tooling and audit. */
export function toJSON(r: DisclosureReport): string {
  return JSON.stringify(r, null, 2);
}
