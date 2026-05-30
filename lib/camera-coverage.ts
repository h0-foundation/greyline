/* Camera coverage geometry — pure, offline, dependency-free.
 *
 * Turns OSM `man_made=surveillance` nodes (incl. DeFlock ALPRs, which are tagged
 * surveillance:type=ALPR/ANPR) into classified markers + field-of-view cones
 * drawn from camera:direction. Grounded in research/MAPS_GEOINT.md: OSM safety
 * tags (camera:direction, surveillance:type) and the OSRM-CCTV coverage model.
 * No turf — small-distance equirectangular wedge math, accurate at street scale.
 */

export type CameraTags = Record<string, string>;
export type CameraKind = "alpr" | "dome" | "fixed";

export interface RawCamera {
  lat?: number;
  lon?: number;
  tags?: CameraTags;
  [k: string]: unknown;
}

const COMPASS: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

/** OSM direction tag → bearing in degrees clockwise from north, or null. */
export function parseBearing(v?: string): number | null {
  if (!v) return null;
  const s = v.trim().toUpperCase();
  if (s in COMPASS) return COMPASS[s];
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return ((n % 360) + 360) % 360;
}

/** License-plate readers (incl. DeFlock), dome (360°), or directional fixed. */
export function classifyCamera(tags: CameraTags = {}): CameraKind {
  const stype = (tags["surveillance:type"] || "").toLowerCase();
  if (stype === "alpr" || stype === "anpr") return "alpr";
  const ctype = (tags["camera:type"] || "").toLowerCase();
  if (ctype === "dome" || ctype === "panning") return "dome";
  return "fixed";
}

// FOV (degrees) + range (metres) we render for each kind. Conservative, for
// awareness — real lenses vary; ALPR is narrow and long, dome is omnidirectional.
export const FOV: Record<CameraKind, number> = { alpr: 34, dome: 360, fixed: 62 };
export const RANGE_M: Record<CameraKind, number> = { alpr: 45, dome: 22, fixed: 35 };

const EARTH_R = 6378137;

/**
 * Coverage polygon ring [[lon,lat],...] for one camera. A dome renders as a
 * full circle; a directional camera as a wedge. A fixed/ALPR camera with no
 * known direction returns [] (we don't guess where it points — only the marker
 * is shown). Closed ring (first point repeated last).
 */
export function coneRing(
  lon: number,
  lat: number,
  kind: CameraKind,
  bearing: number | null,
  steps = 18,
): number[][] {
  const range = RANGE_M[kind];
  const cosLat = Math.cos((lat * Math.PI) / 180) || 1e-6;
  const project = (angDeg: number): number[] => {
    const a = (angDeg * Math.PI) / 180;
    const dLat = ((Math.cos(a) * range) / EARTH_R) * (180 / Math.PI);
    const dLon = ((Math.sin(a) * range) / (EARTH_R * cosLat)) * (180 / Math.PI);
    return [lon + dLon, lat + dLat];
  };
  if (kind === "dome") {
    const n = steps * 2;
    const ring: number[][] = [];
    for (let i = 0; i < n; i++) ring.push(project((360 * i) / n));
    ring.push(ring[0]);
    return ring;
  }
  if (bearing == null) return [];
  const fov = FOV[kind];
  const start = bearing - fov / 2;
  const ring: number[][] = [[lon, lat]];
  for (let i = 0; i <= steps; i++) ring.push(project(start + (fov * i) / steps));
  ring.push([lon, lat]);
  return ring;
}

export interface ConeFeature {
  type: "Feature";
  properties: { kind: CameraKind };
  geometry: { type: "Polygon"; coordinates: number[][][] };
}

export interface ConeCollection {
  type: "FeatureCollection";
  features: ConeFeature[];
}

/** Build the GeoJSON coverage-cone layer for a set of OSM camera nodes. */
export function cameraCones(cameras: RawCamera[]): ConeCollection {
  const features: ConeFeature[] = [];
  for (const cam of cameras) {
    if (typeof cam.lat !== "number" || typeof cam.lon !== "number") continue;
    const tags = cam.tags ?? {};
    const kind = classifyCamera(tags);
    const bearing = parseBearing(tags["camera:direction"] ?? tags["direction"]);
    const ring = coneRing(cam.lon, cam.lat, kind, bearing);
    if (ring.length < 4) continue; // no cone (directionless fixed/ALPR)
    features.push({ type: "Feature", properties: { kind }, geometry: { type: "Polygon", coordinates: [ring] } });
  }
  return { type: "FeatureCollection", features };
}

/** Tallies for the legend: total cameras and how many are ALPR plate-readers. */
export function cameraCounts(cameras: RawCamera[]): { total: number; alpr: number; cctv: number } {
  let alpr = 0;
  let total = 0;
  for (const cam of cameras) {
    if (typeof cam.lat !== "number" || typeof cam.lon !== "number") continue;
    total++;
    if (classifyCamera(cam.tags ?? {}) === "alpr") alpr++;
  }
  return { total, alpr, cctv: total - alpr };
}
