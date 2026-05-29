/* TEDD surveillance analysis — Time, Environment, Distance, Demeanor.
 *
 * The doctrine (Stratfor/TorchStone): a face or vehicle seen twice at the same
 * place and time is a coincidence; the SAME party seen across different TIMES and
 * different LOCATIONS is the actual surveillance signal. The old repeatMatches()
 * only counted recurring strings and ignored those axes — this scores them.
 *
 * Pure + offline. Honest by design: it classifies a recurrence into
 * coincidence / pattern / probable-surveillance from time-spread + geographic
 * spread; it does NOT claim to detect intent (that would be the discredited
 * behavioural-detection paradigm — see research/GRAY_MAN_TRADECRAFT.md). */

export type TeddInput = {
  id: string;
  timestamp: string | null;
  lat: number | null;
  lng: number | null;
  person_desc: string | null;
  vehicle_desc: string | null;
};

export type TeddBand = "coincidence" | "pattern" | "probable-surveillance";

export type TeddSignal = {
  descriptor: string;
  kind: "person" | "vehicle";
  count: number;
  /** hours between the first and last sighting of this descriptor */
  timeSpreadHours: number;
  /** greatest great-circle distance (km) between any two sightings; 0 if <2 have coords */
  maxDistanceKm: number;
  hasGeo: boolean;
  band: TeddBand;
  sightingIds: string[];
};

const BAND_RANK: Record<TeddBand, number> = { "probable-surveillance": 3, pattern: 2, coincidence: 1 };

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function parseTs(ts: string | null): number | null {
  if (!ts) return null;
  // SQLite stores "YYYY-MM-DD HH:MM:SS"; normalize so Date parses consistently.
  const t = new Date(ts.includes("T") ? ts : ts.replace(" ", "T")).getTime();
  return Number.isFinite(t) ? t : null;
}

function classify(count: number, timeSpreadHours: number, maxDistanceKm: number): TeddBand {
  // Different time AND meaningful distance = the real signal; many repeats also escalate.
  if (count >= 3 || (count >= 2 && maxDistanceKm >= 1 && timeSpreadHours >= 1)) return "probable-surveillance";
  if (count >= 2 && (maxDistanceKm >= 0.5 || timeSpreadHours >= 0.75)) return "pattern";
  return "coincidence";
}

/** Group sightings by recurring person/vehicle descriptor and score each group. */
export function analyzeTEDD(sightings: TeddInput[]): TeddSignal[] {
  type Group = { kind: "person" | "vehicle"; ids: string[]; times: number[]; pts: [number, number][] };
  const groups = new Map<string, Group>();

  for (const s of sightings) {
    for (const [kind, raw] of [["person", s.person_desc], ["vehicle", s.vehicle_desc]] as const) {
      const norm = (raw ?? "").trim().toLowerCase();
      if (norm.length < 3) continue;
      const key = `${kind}:${norm}`;
      const g = groups.get(key) ?? { kind, ids: [], times: [], pts: [] };
      g.ids.push(s.id);
      const t = parseTs(s.timestamp);
      if (t !== null) g.times.push(t);
      if (s.lat !== null && s.lng !== null) g.pts.push([s.lat, s.lng]);
      groups.set(key, g);
    }
  }

  const signals: TeddSignal[] = [];
  for (const [key, g] of groups) {
    if (g.ids.length < 2) continue;
    const descriptor = key.slice(key.indexOf(":") + 1);

    const timeSpreadHours =
      g.times.length >= 2 ? (Math.max(...g.times) - Math.min(...g.times)) / 3_600_000 : 0;

    let maxDistanceKm = 0;
    for (let i = 0; i < g.pts.length; i++) {
      for (let j = i + 1; j < g.pts.length; j++) {
        maxDistanceKm = Math.max(maxDistanceKm, haversineKm(g.pts[i][0], g.pts[i][1], g.pts[j][0], g.pts[j][1]));
      }
    }

    signals.push({
      descriptor,
      kind: g.kind,
      count: g.ids.length,
      timeSpreadHours: Math.round(timeSpreadHours * 10) / 10,
      maxDistanceKm: Math.round(maxDistanceKm * 10) / 10,
      hasGeo: g.pts.length >= 2,
      band: classify(g.ids.length, timeSpreadHours, maxDistanceKm),
      sightingIds: g.ids,
    });
  }

  return signals.sort(
    (a, b) => BAND_RANK[b.band] - BAND_RANK[a.band] || b.count - a.count || b.maxDistanceKm - a.maxDistanceKm,
  );
}

export const TEDD_BAND_LABEL: Record<TeddBand, string> = {
  "probable-surveillance": "Probable surveillance",
  pattern: "Pattern",
  coincidence: "Coincidence",
};
