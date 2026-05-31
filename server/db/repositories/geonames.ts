import { getDb } from "../index";

// Offline GeoNames cities gazetteer (5000+ population). The on-device place
// resolver — search, browse-by-country, and nearest-city — with no network.
// Mirrors server/db/repositories/airports.ts (haversine nearest).

export interface GeonamesCity {
  geonameid: number;
  name: string;
  asciiname: string | null;
  lat: number;
  lng: number;
  country_code: string | null;
  admin1_code: string | null;
  population: number;
  timezone: string | null;
}

/** Name search (native + ASCII), most-populous first. */
export function searchCities(query: string, limit = 20): GeonamesCity[] {
  const q = `${query.trim().toLowerCase()}%`;
  const qAny = `%${query.trim().toLowerCase()}%`;
  return getDb()
    .prepare(
      `SELECT * FROM geonames_cities
       WHERE LOWER(asciiname) LIKE ? OR LOWER(name) LIKE ?
       ORDER BY (CASE WHEN LOWER(asciiname) LIKE ? THEN 0 ELSE 1 END), population DESC
       LIMIT ?`,
    )
    .all(qAny, qAny, q, limit) as GeonamesCity[];
}

/** Cities in a country, most-populous first. */
export function getCitiesByCountry(iso2: string, limit = 50): GeonamesCity[] {
  return getDb()
    .prepare(`SELECT * FROM geonames_cities WHERE country_code = ? ORDER BY population DESC LIMIT ?`)
    .all(iso2.toUpperCase(), limit) as GeonamesCity[];
}

/** Nearest cities to a point (haversine), like nearestAirports. */
export function nearestCities(lat: number, lng: number, limit = 5): (GeonamesCity & { distance_km: number })[] {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const box = 3; // ~333 km latitude window
  const lngPad = box / Math.max(0.01, Math.cos(toRad(lat)));
  const rows = getDb()
    .prepare(`SELECT * FROM geonames_cities WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?`)
    .all(lat - box, lat + box, lng - lngPad, lng + lngPad) as GeonamesCity[];

  const R = 6371;
  const phi1 = toRad(lat);
  return rows
    .map((c) => {
      const dLat = toRad(c.lat - lat);
      const dLng = toRad(c.lng - lng);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(phi1) * Math.cos(toRad(c.lat)) * Math.sin(dLng / 2) ** 2;
      return { ...c, distance_km: Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h)))) };
    })
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit);
}
