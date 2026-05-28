// Pure analysis over a sequence of trip flights — layover detection, transit
// visa & posture lookups, routing-sanity checks. Designed to run inside the
// trip detail server component; no DB / network calls here, just shape →
// shape transforms.

export type FlightStage = {
  id: string;
  carrier_iata: string | null;
  flight_number: string | null;
  dep_iata: string | null;
  dep_time: string | null;
  arr_iata: string | null;
  arr_time: string | null;
  status: "planned" | "booked" | "flown" | "cancelled";
};

export type AirportLite = {
  iata: string;
  name: string;
  iso_country: string | null;
  municipality: string | null;
};

export type Layover = {
  stage_in: FlightStage;
  stage_out: FlightStage;
  airport: AirportLite | null;
  iata: string;
  iso_country: string | null;
  duration_min: number | null;
  tight: boolean;          // < 60 min (IATA MCT-ish heuristic)
  overnight: boolean;      // gap crosses local midnight
  misroute: boolean;       // arrival airport ≠ next departure airport
  transit_country: string | null;
  // posture pulled in by caller:
  transit_visa?: { requirement: string; detail: string | null } | null;
  advisory_level?: number | null;
  posture_flags?: string[];
};

const TIGHT_THRESHOLD_MIN = 60;

function parseTime(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function localMidnightCrossings(a: string | null, b: string | null): boolean {
  const ta = parseTime(a), tb = parseTime(b);
  if (ta == null || tb == null) return false;
  const da = new Date(ta).toISOString().slice(0, 10);
  const db = new Date(tb).toISOString().slice(0, 10);
  return da !== db;
}

export function detectLayovers(flights: FlightStage[]): Layover[] {
  const sorted = [...flights].sort((a, b) => {
    const ta = parseTime(a.dep_time) ?? 0;
    const tb = parseTime(b.dep_time) ?? 0;
    return ta - tb;
  });
  const out: Layover[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const prev = sorted[i];
    const next = sorted[i + 1];
    if (!prev.arr_iata || !next.dep_iata) continue;
    const tArr = parseTime(prev.arr_time);
    const tDep = parseTime(next.dep_time);
    const durMin = tArr != null && tDep != null ? Math.round((tDep - tArr) / 60000) : null;
    out.push({
      stage_in: prev,
      stage_out: next,
      airport: null,
      iata: next.dep_iata.toUpperCase(),
      iso_country: null,
      duration_min: durMin,
      tight: durMin != null && durMin < TIGHT_THRESHOLD_MIN,
      overnight: localMidnightCrossings(prev.arr_time, next.dep_time),
      misroute: prev.arr_iata.toUpperCase() !== next.dep_iata.toUpperCase(),
      transit_country: null,
    });
  }
  return out;
}

export function enrichLayover(
  l: Layover,
  ctx: {
    airportByIata: Map<string, AirportLite>;
    visaForCountry: (iso2: string) => { requirement: string; detail: string | null } | null;
    advisoryLevelFor: (iso2: string) => number | null;
    intelFor: (iso2: string) => {
      sim_registration: string | null;
      decryption_compulsion: string | null;
      apis_pnr_note: string | null;
    } | null;
  },
): Layover {
  const ap = ctx.airportByIata.get(l.iata) ?? null;
  const country = ap?.iso_country ?? null;
  const transit_visa = country ? ctx.visaForCountry(country) : null;
  const advisory_level = country ? ctx.advisoryLevelFor(country) : null;
  const intel = country ? ctx.intelFor(country) : null;
  const flags: string[] = [];
  if (intel?.apis_pnr_note) flags.push(intel.apis_pnr_note);
  if (intel?.decryption_compulsion === "yes") flags.push("device unlock may be compelled");
  if (intel?.decryption_compulsion === "possible") flags.push("device unlock has happened");
  return { ...l, airport: ap, iso_country: country, transit_country: country, transit_visa, advisory_level, posture_flags: flags };
}

/** Single number summarising the routing — used in the trip header. */
export function routeExposureScore(layovers: Layover[]): number {
  let s = 0;
  for (const l of layovers) {
    s += (l.advisory_level ?? 1) - 1;
    if (l.transit_visa?.requirement === "visa_required") s += 2;
    if (l.transit_visa?.requirement === "no_admission") s += 4;
    if (l.tight) s += 1;
    if (l.misroute) s += 2;
    if (l.posture_flags?.length) s += Math.min(2, l.posture_flags.length);
  }
  return s;
}
