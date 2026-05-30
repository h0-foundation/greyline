/* SDR / egress route planning — pure, offline, dependency-free.
 *
 * A surveillance-detection route (SDR) deliberately deviates from the direct
 * path so a follower must commit to conspicuous moves; an egress/extraction
 * route is the rehearsed way out; a variation breaks a routine pattern.
 * Defensive tradecraft only (research/COUNTER_SURVEILLANCE.md, GRAY_MAN_
 * TRADECRAFT.md — TEDD-aligned). These helpers score a hand-drawn waypoint path
 * with great-circle legs — no routing engine required, fully on-device.
 */

export interface LngLat {
  lng: number;
  lat: number;
}

const EARTH_R = 6371008.8; // mean radius, metres (IUGG)

/** Great-circle distance between two points, in metres. */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface RouteMetrics {
  points: number;
  legs: number;
  totalM: number; // path length summed along the waypoints
  directM: number; // straight-line origin → destination
  longestLegM: number;
  deviationRatio: number; // totalM / directM (1 = straight; higher = more SDR deviation)
}

export function routeMetrics(waypoints: LngLat[]): RouteMetrics {
  const pts = (waypoints ?? []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (pts.length < 2) {
    return { points: pts.length, legs: 0, totalM: 0, directM: 0, longestLegM: 0, deviationRatio: 0 };
  }
  let total = 0;
  let longest = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = haversineMeters(pts[i - 1], pts[i]);
    total += d;
    if (d > longest) longest = d;
  }
  const direct = haversineMeters(pts[0], pts[pts.length - 1]);
  return {
    points: pts.length,
    legs: pts.length - 1,
    totalM: total,
    directM: direct,
    longestLegM: longest,
    deviationRatio: direct > 0 ? total / direct : 0,
  };
}

/** Qualitative read of how much an SDR deviates from the direct line. */
export function deviationLabel(ratio: number): string {
  if (ratio <= 0) return "—";
  if (ratio < 1.2) return "Direct — little detection value";
  if (ratio < 1.8) return "Moderate deviation";
  if (ratio < 3) return "Strong deviation — good SDR";
  return "Very indirect — high time cost";
}

export function formatDistance(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "0 m";
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`;
}

export const ROUTE_TYPES = [
  { value: "sdr", label: "SDR", color: "#e0b24a", hint: "Surveillance-detection route — deliberate deviations and choke points that force a follower to expose themselves." },
  { value: "extraction", label: "Extraction", color: "#74b277", hint: "Pre-planned egress from a venue or area to a safe point." },
  { value: "variation", label: "Variation", color: "#7fb2ff", hint: "An alternate of a routine route — never run the same pattern twice." },
  { value: "normal", label: "Normal", color: "#9aa39c", hint: "An ordinary planned route, kept for reference." },
] as const;

export type RouteType = (typeof ROUTE_TYPES)[number]["value"];

export const ROUTE_COLOR: Record<string, string> = Object.fromEntries(
  ROUTE_TYPES.map((t) => [t.value, t.color]),
);
