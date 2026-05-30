/* Line-of-sight / viewshed exposure — pure, offline, dependency-free.
 *
 * Given your position, a set of observers (CCTV cameras, a tail's vantage
 * point), and the building footprints between you, work out which observers
 * actually have an unobstructed line of sight to you — and how exposed you are
 * overall. Grounded in research/MAPS_GEOINT.md (line-of-sight / viewshed for
 * counter-surveillance). 2-D obstruction model: a sight line is blocked if it
 * crosses any opaque footprint (building/wall) edge between observer and target.
 * Equirectangular local projection — accurate at street scale; no turf, no DEM.
 *
 * No DOM, no network, no Date — unit-testable directly.
 */

export interface LngLat {
  lon: number;
  lat: number;
}

export interface Observer extends LngLat {
  id: string;
  /** Optional label (e.g. "ALPR camera", "café window"). */
  label?: string;
  /** Effective sight range in metres (beyond this the observer can't resolve you). */
  rangeM?: number;
}

/** A closed or open obstruction outline (building/wall) as a ring of points. */
export type Footprint = LngLat[];

export interface Sightline {
  observerId: string;
  /** Straight-line distance observer→target, metres. */
  distanceM: number;
  /** True when the observer can see the target (in range AND not blocked). */
  visible: boolean;
  /** Why it's not visible, when applicable. */
  blockedBy: "range" | "obstruction" | null;
}

export interface ExposureReport {
  total: number;
  /** Observers with an unobstructed in-range line of sight. */
  exposedTo: number;
  sightlines: Sightline[];
  /** exposedTo / total, 0..1 (0 when there are no observers). */
  exposureRatio: number;
  band: "clear" | "low" | "moderate" | "high";
}

const EARTH_R = 6378137;

/** Project lon/lat to local east/north metres around an origin (equirect). */
export function toLocalMeters(p: LngLat, origin: LngLat): { x: number; y: number } {
  const latRad = (origin.lat * Math.PI) / 180;
  const x = ((p.lon - origin.lon) * Math.PI) / 180 * EARTH_R * Math.cos(latRad);
  const y = ((p.lat - origin.lat) * Math.PI) / 180 * EARTH_R;
  return { x, y };
}

/** Straight-line distance between two coordinates, in metres. */
export function distanceMeters(a: LngLat, b: LngLat): number {
  const { x, y } = toLocalMeters(b, a);
  return Math.hypot(x, y);
}

type Pt = { x: number; y: number };

/** Orientation sign of the triangle (a,b,c): >0 ccw, <0 cw, 0 collinear. */
function cross(a: Pt, b: Pt, c: Pt): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a: Pt, b: Pt, p: Pt): boolean {
  return (
    Math.min(a.x, b.x) - 1e-9 <= p.x && p.x <= Math.max(a.x, b.x) + 1e-9 &&
    Math.min(a.y, b.y) - 1e-9 <= p.y && p.y <= Math.max(a.y, b.y) + 1e-9
  );
}

/** Do segments p1p2 and p3p4 properly intersect? (standard CCW test). */
export function segmentsIntersect(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  // Collinear-overlap endpoints.
  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;
  return false;
}

/** True if the sight line a→b is blocked by any footprint edge. Endpoints that
 *  merely touch a footprint vertex are ignored (a tiny pull-in avoids treating
 *  the observer/target sitting exactly on a wall as self-blocking). */
function lineBlocked(a: Pt, b: Pt, footprintsLocal: Pt[][]): boolean {
  // Pull the endpoints slightly toward each other so a shared endpoint with a
  // footprint vertex doesn't count as an intersection.
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const eps = Math.min(0.05, len * 0.001); // ≤5 cm
  const a2 = { x: a.x + (dx / len) * eps, y: a.y + (dy / len) * eps };
  const b2 = { x: b.x - (dx / len) * eps, y: b.y - (dy / len) * eps };

  for (const ring of footprintsLocal) {
    if (ring.length < 2) continue;
    for (let i = 0; i < ring.length - 1; i++) {
      if (segmentsIntersect(a2, b2, ring[i], ring[i + 1])) return true;
    }
  }
  return false;
}

function bandFor(ratio: number, exposedTo: number): ExposureReport["band"] {
  if (exposedTo === 0) return "clear";
  if (ratio >= 0.66) return "high";
  if (ratio >= 0.33) return "moderate";
  return "low";
}

/**
 * Compute line-of-sight from each observer to the target, accounting for range
 * and 2-D obstruction by building/wall footprints. Returns per-observer
 * sightlines plus an overall exposure summary.
 */
export function computeExposure(
  target: LngLat,
  observers: Observer[],
  footprints: Footprint[] = [],
  defaultRangeM = 60,
): ExposureReport {
  const t = { x: 0, y: 0 }; // target is the projection origin
  const footprintsLocal = footprints.map((ring) => ring.map((p) => toLocalMeters(p, target)));

  const sightlines: Sightline[] = observers.map((o) => {
    const op = toLocalMeters(o, target);
    const distanceM = Math.hypot(op.x, op.y);
    const range = o.rangeM ?? defaultRangeM;
    if (distanceM > range) {
      return { observerId: o.id, distanceM, visible: false, blockedBy: "range" };
    }
    if (lineBlocked(op, t, footprintsLocal)) {
      return { observerId: o.id, distanceM, visible: false, blockedBy: "obstruction" };
    }
    return { observerId: o.id, distanceM, visible: true, blockedBy: null };
  });

  const exposedTo = sightlines.filter((s) => s.visible).length;
  const total = observers.length;
  const exposureRatio = total === 0 ? 0 : exposedTo / total;
  return { total, exposedTo, sightlines, exposureRatio, band: bandFor(exposureRatio, exposedTo) };
}
