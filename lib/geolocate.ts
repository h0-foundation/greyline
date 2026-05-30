/* OSM feature-cluster geolocation — pure, offline, dependency-free.
 *
 * A Bellingcat-style chronolocation/geolocation aid: an investigator who can
 * identify a handful of distinctive features in a photo (a mosque, a petrol
 * station, a tram stop, a pharmacy cross) finds the places where those features
 * *co-occur within a short walk* of each other. The more of the chosen feature
 * types cluster together, the stronger the candidate location.
 *
 * The ranking logic here is pure and deterministic so it can be unit-tested and
 * run entirely on-device over either a pasted Overpass JSON export (fully
 * offline) or, when the user opts the Overpass connector in, a live query built
 * by `buildOverpassQuery`. No network, DOM, or Date access in this module.
 */

export interface FeatureType {
  /** Stable id used in the UI, query, and classification. */
  id: string;
  label: string;
  /** A short hint shown under the label. */
  hint: string;
  /**
   * Tag selectors for CLASSIFYING a returned element. An element matches this
   * feature type if it satisfies ANY selector; a selector matches when every
   * key/value pair in it is present (value `true` = key present with any value).
   */
  selectors: Array<Record<string, string | true>>;
  /**
   * Overpass QL element fragments to QUERY for this type, e.g.
   * `node["amenity"="fuel"]`. Emitted inside a bbox union by buildOverpassQuery.
   */
  overpass: string[];
}

/** A curated catalog of distinctive, photo-identifiable OSM features. */
export const FEATURE_TYPES: FeatureType[] = [
  {
    id: "mosque",
    label: "Mosque / minaret",
    hint: "place_of_worship · muslim",
    selectors: [{ amenity: "place_of_worship", religion: "muslim" }],
    overpass: ['node["amenity"="place_of_worship"]["religion"="muslim"]'],
  },
  {
    id: "church",
    label: "Church",
    hint: "place_of_worship · christian",
    selectors: [{ amenity: "place_of_worship", religion: "christian" }],
    overpass: ['node["amenity"="place_of_worship"]["religion"="christian"]'],
  },
  {
    id: "fuel",
    label: "Petrol station",
    hint: "amenity=fuel",
    selectors: [{ amenity: "fuel" }],
    overpass: ['node["amenity"="fuel"]'],
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    hint: "amenity=pharmacy",
    selectors: [{ amenity: "pharmacy" }],
    overpass: ['node["amenity"="pharmacy"]'],
  },
  {
    id: "fast_food",
    label: "Fast food",
    hint: "amenity=fast_food",
    selectors: [{ amenity: "fast_food" }],
    overpass: ['node["amenity"="fast_food"]'],
  },
  {
    id: "bank",
    label: "Bank / ATM",
    hint: "amenity=bank|atm",
    selectors: [{ amenity: "bank" }, { amenity: "atm" }],
    overpass: ['node["amenity"="bank"]', 'node["amenity"="atm"]'],
  },
  {
    id: "supermarket",
    label: "Supermarket",
    hint: "shop=supermarket",
    selectors: [{ shop: "supermarket" }],
    overpass: ['node["shop"="supermarket"]'],
  },
  {
    id: "school",
    label: "School",
    hint: "amenity=school",
    selectors: [{ amenity: "school" }],
    overpass: ['node["amenity"="school"]'],
  },
  {
    id: "hospital",
    label: "Hospital",
    hint: "amenity=hospital",
    selectors: [{ amenity: "hospital" }],
    overpass: ['node["amenity"="hospital"]'],
  },
  {
    id: "police",
    label: "Police station",
    hint: "amenity=police",
    selectors: [{ amenity: "police" }],
    overpass: ['node["amenity"="police"]'],
  },
  {
    id: "tram_stop",
    label: "Tram stop",
    hint: "railway=tram_stop",
    selectors: [{ railway: "tram_stop" }],
    overpass: ['node["railway"="tram_stop"]'],
  },
  {
    id: "subway",
    label: "Subway entrance",
    hint: "railway=subway_entrance",
    selectors: [{ railway: "subway_entrance" }],
    overpass: ['node["railway"="subway_entrance"]'],
  },
  {
    id: "fountain",
    label: "Fountain",
    hint: "amenity=fountain",
    selectors: [{ amenity: "fountain" }],
    overpass: ['node["amenity"="fountain"]'],
  },
  {
    id: "monument",
    label: "Statue / monument",
    hint: "historic · artwork",
    selectors: [{ historic: "monument" }, { historic: "memorial" }, { tourism: "artwork" }],
    overpass: [
      'node["historic"="monument"]',
      'node["historic"="memorial"]',
      'node["tourism"="artwork"]',
    ],
  },
  {
    id: "tower",
    label: "Tower / mast",
    hint: "man_made=tower|mast",
    selectors: [{ man_made: "tower" }, { man_made: "mast" }, { man_made: "water_tower" }],
    overpass: [
      'node["man_made"="tower"]',
      'node["man_made"="mast"]',
      'node["man_made"="water_tower"]',
    ],
  },
  {
    id: "stadium",
    label: "Stadium",
    hint: "leisure=stadium",
    selectors: [{ leisure: "stadium" }],
    overpass: ['node["leisure"="stadium"]'],
  },
];

const FEATURE_BY_ID = new Map(FEATURE_TYPES.map((f) => [f.id, f]));

export interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  /** Overpass returns way/relation centroids under `center`. */
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface ClassifiedFeature {
  id: number;
  lat: number;
  lon: number;
  /** Feature-type ids this element matched (from the requested set). */
  typeIds: string[];
  name?: string;
}

export interface OverpassBbox {
  s: number;
  w: number;
  n: number;
  e: number;
}

/** Mean Earth radius (metres). */
const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance between two lat/lon points, in metres. */
export function haversineMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLon = (b.lon - a.lon) * toRad;
  const lat1 = a.lat * toRad;
  const lat2 = b.lat * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Does an element satisfy a feature type's selectors? Returns true on any. */
function elementMatchesType(tags: Record<string, string>, type: FeatureType): boolean {
  return type.selectors.some((sel) =>
    Object.entries(sel).every(([k, v]) => (v === true ? k in tags : tags[k] === v)),
  );
}

/**
 * Classify raw Overpass elements against the requested feature-type ids,
 * dropping anything that matches none of them or has no coordinate. Way/relation
 * centroids (`center`) are accepted so non-node features still contribute.
 */
export function classifyElements(
  elements: OsmElement[],
  requestedTypeIds: string[],
): ClassifiedFeature[] {
  const types = requestedTypeIds
    .map((id) => FEATURE_BY_ID.get(id))
    .filter((t): t is FeatureType => Boolean(t));
  const out: ClassifiedFeature[] = [];

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    const tags = el.tags ?? {};
    const typeIds = types.filter((t) => elementMatchesType(tags, t)).map((t) => t.id);
    if (typeIds.length === 0) continue;
    out.push({ id: el.id, lat, lon, typeIds, name: tags.name });
  }
  return out;
}

export interface Cluster {
  /** Centroid of the cluster members (mean lat/lon). */
  lat: number;
  lon: number;
  /** Distinct requested feature types present in the cluster. */
  matchedTypeIds: string[];
  matchedCount: number;
  members: ClassifiedFeature[];
  /** Largest distance (m) from the centroid to any member — cluster tightness. */
  spreadMeters: number;
}

function distinctTypes(features: ClassifiedFeature[]): string[] {
  const set = new Set<string>();
  for (const f of features) for (const t of f.typeIds) set.add(t);
  return [...set];
}

function centroid(features: ClassifiedFeature[]): { lat: number; lon: number } {
  const n = features.length;
  let lat = 0;
  let lon = 0;
  for (const f of features) {
    lat += f.lat;
    lon += f.lon;
  }
  return { lat: lat / n, lon: lon / n };
}

/**
 * Find candidate locations where the requested feature types co-occur within
 * `radiusMeters`. Each feature seeds a candidate cluster from its neighbours;
 * candidates are ranked by how many DISTINCT requested types they contain
 * (more is better), then by tightness (smaller spread is better), then by
 * coordinate for a stable order. Overlapping candidates are suppressed
 * (non-maximum suppression): once a cluster is accepted, weaker candidates
 * whose centroid lies within `radiusMeters` of it are dropped.
 *
 * `minTypes` filters out weak clusters (default 2, capped at the number of
 * requested types so a single-type search still returns hits).
 */
export function clusterByCooccurrence(
  features: ClassifiedFeature[],
  requestedTypeIds: string[],
  radiusMeters: number,
  minTypes = 2,
): Cluster[] {
  const wanted = new Set(requestedTypeIds);
  const pts = features.filter((f) => f.typeIds.some((t) => wanted.has(t)));
  const threshold = Math.min(minTypes, wanted.size);

  const candidates: Cluster[] = [];
  for (const seed of pts) {
    const members = pts.filter((f) => haversineMeters(seed, f) <= radiusMeters);
    const matchedTypeIds = distinctTypes(members)
      .filter((t) => wanted.has(t))
      .sort();
    if (matchedTypeIds.length < threshold) continue;
    const c = centroid(members);
    const spreadMeters = members.reduce((mx, m) => Math.max(mx, haversineMeters(c, m)), 0);
    candidates.push({
      lat: c.lat,
      lon: c.lon,
      matchedTypeIds,
      matchedCount: matchedTypeIds.length,
      members,
      spreadMeters,
    });
  }

  candidates.sort(
    (a, b) =>
      b.matchedCount - a.matchedCount ||
      a.spreadMeters - b.spreadMeters ||
      a.lat - b.lat ||
      a.lon - b.lon,
  );

  // Non-maximum suppression: keep the strongest, drop near-duplicates.
  const accepted: Cluster[] = [];
  for (const cand of candidates) {
    if (accepted.some((a) => haversineMeters(a, cand) <= radiusMeters)) continue;
    accepted.push(cand);
  }
  return accepted;
}

/**
 * Build an Overpass QL query for the requested feature types within a bbox.
 * Emits a single `out center` union so way/relation features return centroids.
 * Returns "" when no known type is requested (caller should skip the fetch).
 */
export function buildOverpassQuery(
  requestedTypeIds: string[],
  bbox: OverpassBbox,
  timeoutSeconds = 30,
): string {
  const bb = `(${bbox.s},${bbox.w},${bbox.n},${bbox.e})`;
  const fragments = requestedTypeIds
    .map((id) => FEATURE_BY_ID.get(id))
    .filter((t): t is FeatureType => Boolean(t))
    .flatMap((t) =>
      t.overpass.flatMap((frag) => {
        // Query nodes plus ways/relations so areal features (a stadium, a large
        // place of worship) are not missed; `out center` gives them a centroid.
        const base = frag.replace(/^node/, "");
        return [`node${base}${bb};`, `way${base}${bb};`, `relation${base}${bb};`];
      }),
    );
  if (fragments.length === 0) return "";
  return `[out:json][timeout:${timeoutSeconds}];(${fragments.join("")});out center tags;`;
}

/** Human label for a feature-type id (falls back to the id). */
export function featureLabel(id: string): string {
  return FEATURE_BY_ID.get(id)?.label ?? id;
}
