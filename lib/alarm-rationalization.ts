/* Alarm rationalization (EEMUA-191 style) — pure, offline, dependency-free.
 *
 * Raw hazard feeds (GDACS disasters, USGS earthquakes) flood the map with
 * overlapping, unprioritized markers. EEMUA Publication 191 ("Alarm Systems")
 * is the human-factors standard for industrial alarm handling: every alarm must
 * be RELEVANT, UNIQUE, PRIORITISED and ACTIONABLE, and the system must not flood
 * the operator. This module applies those principles to travel-hazard alerts:
 *   - normalise heterogeneous feeds into one Alert shape,
 *   - filter to what's relevant (distance from the traveller, min severity),
 *   - de-duplicate near-identical events (same kind, close in space + time),
 *   - prioritise (severity, then proximity, then recency),
 *   - flood-suppress (cap per priority band; report what was held back).
 *
 * No DOM, no network, no Date — `now`/positions are passed in. Unit-testable.
 */

export type HazardKind =
  | "earthquake"
  | "cyclone"
  | "flood"
  | "volcano"
  | "drought"
  | "wildfire"
  | "other";

/** EEMUA-style priority bands (4 = act now … 0 = awareness only). */
export type Priority = 0 | 1 | 2 | 3 | 4;

export interface Alert {
  id: string;
  kind: HazardKind;
  /** Source severity normalised to 0..4 (feed-specific mapping). */
  severity: number;
  title: string;
  lat: number;
  lon: number;
  /** Event time, epoch milliseconds. */
  time: number;
  /** Original feed object, for the UI to drill into. */
  raw?: unknown;
}

export interface RationalizedAlert extends Alert {
  priority: Priority;
  priorityLabel: string;
  /** Distance from the traveller in km, when an origin was supplied. */
  distanceKm: number | null;
  /** How many duplicate reports this alert absorbed (1 = unique). */
  mergedCount: number;
  /** A short, imperative next step — EEMUA "every alarm is actionable". */
  action: string;
}

export interface RationalizeOptions {
  /** Traveller position; enables proximity ranking + radius filtering. */
  origin?: { lat: number; lon: number };
  /** Drop alerts farther than this from origin (km). Ignored without origin. */
  radiusKm?: number;
  /** Drop alerts below this normalised severity (0..4). Default 0. */
  minSeverity?: number;
  /** Two same-kind alerts within this distance are duplicates (km). Default 50. */
  dedupeKm?: number;
  /** …and within this time window (ms). Default 6 h. */
  dedupeWindowMs?: number;
  /** Max alerts shown per priority band before suppression. Default 5. */
  maxPerBand?: number;
}

export interface RationalizeResult {
  alerts: RationalizedAlert[];
  /** Counts by priority band after rationalization. */
  byPriority: Record<Priority, number>;
  /** Total raw alerts in. */
  totalIn: number;
  /** Removed because below minSeverity or outside radius. */
  filtered: number;
  /** Removed as duplicates (merged into a kept alert). */
  deduped: number;
  /** Held back by per-band flood suppression. */
  suppressed: number;
}

const EARTH_R_KM = 6371;

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLon = (b.lon - a.lon) * toRad;
  const la1 = a.lat * toRad;
  const la2 = b.lat * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const PRIORITY_LABEL: Record<Priority, string> = {
  4: "Critical",
  3: "High",
  2: "Medium",
  1: "Low",
  0: "Advisory",
};

// Per-kind, imperative next step. EEMUA: an alarm with no response is noise.
const ACTION: Record<HazardKind, string> = {
  earthquake: "Check structural safety; expect aftershocks and service disruption.",
  cyclone: "Track the path; secure shelter and avoid the coast/flood zones.",
  flood: "Avoid low ground and water crossings; move valuables and documents up.",
  volcano: "Heed exclusion zones; prepare for ashfall and flight disruption.",
  drought: "Plan water/fuel; expect heightened wildfire and unrest risk.",
  wildfire: "Know two exit routes; monitor evacuation orders and air quality.",
  other: "Monitor local authorities for guidance.",
};

/**
 * Map a normalised severity (0..4) and distance to an EEMUA priority band.
 * Proximity escalates: a strong, nearby hazard outranks a strong, distant one.
 */
export function priorityFor(severity: number, distanceKm: number | null): Priority {
  let p = Math.max(0, Math.min(4, Math.round(severity)));
  if (distanceKm !== null) {
    if (distanceKm <= 100 && p < 4) p += 1; // close → escalate one band
    else if (distanceKm > 1000 && p > 0) p -= 1; // far → de-escalate one band
  }
  return Math.max(0, Math.min(4, p)) as Priority;
}

/** USGS earthquake magnitude → 0..4 severity (M<4 → 0 … M≥7 → 4). */
export function severityFromMagnitude(mag: number): number {
  if (mag >= 7) return 4;
  if (mag >= 6) return 3;
  if (mag >= 5) return 2;
  if (mag >= 4) return 1;
  return 0;
}

/** GDACS alert level → 0..4 severity. */
export function severityFromGdacsLevel(level: string): number {
  switch ((level || "").toLowerCase()) {
    case "red": return 4;
    case "orange": return 2;
    case "green": return 1;
    default: return 0;
  }
}

const GDACS_KIND: Record<string, HazardKind> = {
  EQ: "earthquake", TC: "cyclone", FL: "flood", VO: "volcano", DR: "drought", WF: "wildfire",
};

/** Normalise USGS GeoJSON features into Alerts. Coordinates are [lon,lat,depth]. */
export function normalizeUsgs(features: Array<{ id?: string; properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } }>): Alert[] {
  const out: Alert[] = [];
  for (const f of features) {
    const c = f.geometry?.coordinates;
    if (!c || c.length < 2) continue;
    const mag = Number(f.properties?.mag);
    out.push({
      id: f.id ?? `usgs-${c[1]},${c[0]}`,
      kind: "earthquake",
      severity: severityFromMagnitude(Number.isFinite(mag) ? mag : 0),
      title: String(f.properties?.title ?? f.properties?.place ?? "Earthquake"),
      lat: c[1],
      lon: c[0],
      time: Number(f.properties?.time) || 0,
      raw: f,
    });
  }
  return out;
}

/** Normalise GDACS features into Alerts. */
export function normalizeGdacs(features: Array<{ properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } }>): Alert[] {
  const out: Alert[] = [];
  for (const f of features) {
    const c = f.geometry?.coordinates;
    if (!c || c.length < 2) continue;
    const p = f.properties ?? {};
    const evType = String(p.eventtype ?? "").toUpperCase();
    const level = String(p.alertlevel ?? "");
    const fromdate = p.fromdate ? Date.parse(String(p.fromdate)) : 0;
    out.push({
      id: String(p.eventid ?? p.episodeid ?? `gdacs-${c[1]},${c[0]}`),
      kind: GDACS_KIND[evType] ?? "other",
      severity: severityFromGdacsLevel(level),
      title: String(p.name ?? p.htmldescription ?? `${evType || "Hazard"} event`),
      lat: c[1],
      lon: c[0],
      time: Number.isFinite(fromdate) ? fromdate : 0,
      raw: f,
    });
  }
  return out;
}

/**
 * Apply EEMUA-style rationalization to a set of normalised alerts.
 * Pure: pass `now` only if you need time-relative behaviour elsewhere — this
 * function itself doesn't read the clock.
 */
export function rationalize(input: Alert[], opts: RationalizeOptions = {}): RationalizeResult {
  const {
    origin,
    radiusKm,
    minSeverity = 0,
    dedupeKm = 50,
    dedupeWindowMs = 6 * 60 * 60 * 1000,
    maxPerBand = 5,
  } = opts;

  const totalIn = input.length;

  // 1) Relevance filter: severity floor + optional radius.
  let filtered = 0;
  const relevant = input.filter((a) => {
    if (a.severity < minSeverity) { filtered++; return false; }
    if (origin && radiusKm != null) {
      if (haversineKm(origin, a) > radiusKm) { filtered++; return false; }
    }
    return true;
  });

  // 2) De-duplicate: same kind, within dedupeKm + dedupeWindowMs. Keep the
  //    highest-severity (then most-recent) representative; count the merges.
  const kept: Array<Alert & { mergedCount: number }> = [];
  let deduped = 0;
  // Strongest first so the representative we keep is the most severe.
  const ordered = [...relevant].sort((a, b) => b.severity - a.severity || b.time - a.time);
  for (const a of ordered) {
    const dup = kept.find(
      (k) =>
        k.kind === a.kind &&
        Math.abs(k.time - a.time) <= dedupeWindowMs &&
        haversineKm(k, a) <= dedupeKm,
    );
    if (dup) { dup.mergedCount++; deduped++; }
    else kept.push({ ...a, mergedCount: 1 });
  }

  // 3) Prioritise + attach actions.
  const enriched: RationalizedAlert[] = kept.map((a) => {
    const distanceKm = origin ? haversineKm(origin, a) : null;
    const priority = priorityFor(a.severity, distanceKm);
    return {
      ...a,
      distanceKm,
      priority,
      priorityLabel: PRIORITY_LABEL[priority],
      action: ACTION[a.kind],
    };
  });
  enriched.sort(
    (a, b) =>
      b.priority - a.priority ||
      (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
      b.time - a.time,
  );

  // 4) Flood suppression: cap each priority band to maxPerBand.
  const seenInBand: Record<number, number> = {};
  let suppressed = 0;
  const shown: RationalizedAlert[] = [];
  for (const a of enriched) {
    const n = (seenInBand[a.priority] ?? 0) + 1;
    seenInBand[a.priority] = n;
    if (n <= maxPerBand) shown.push(a);
    else suppressed++;
  }

  const byPriority: Record<Priority, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const a of shown) byPriority[a.priority]++;

  return { alerts: shown, byPriority, totalIn, filtered, deduped, suppressed };
}
