import { getDb } from '../index';

export interface Airport {
  ident: string;
  type: string | null;
  name: string;
  lat: number | null;
  lng: number | null;
  elevation_ft: number | null;
  iso_country: string | null;
  iso_region: string | null;
  municipality: string | null;
  scheduled_service: number;
  iata_code: string | null;
  icao_code: string | null;
}

const SERVICE_TYPES = "('large_airport','medium_airport','small_airport')";

/** Airports with scheduled service in a country, biggest first. */
export function getAirportsByCountry(iso2: string, limit = 200): Airport[] {
  return getDb()
    .prepare(
      `SELECT * FROM airports
       WHERE iso_country = ? AND scheduled_service = 1 AND type IN ${SERVICE_TYPES}
       ORDER BY CASE type WHEN 'large_airport' THEN 0 WHEN 'medium_airport' THEN 1 ELSE 2 END, name
       LIMIT ?`,
    )
    .all(iso2.toUpperCase(), limit) as Airport[];
}

export function getAirport(ident: string): Airport | undefined {
  return getDb().prepare('SELECT * FROM airports WHERE ident = ?').get(ident) as Airport | undefined;
}

export function getAirportByIata(iata: string): Airport | undefined {
  return getDb()
    .prepare("SELECT * FROM airports WHERE iata_code = ? AND iata_code != '' LIMIT 1")
    .get(iata.toUpperCase()) as Airport | undefined;
}

/** Name / IATA / ICAO / municipality search, scheduled-service airports first. */
export function searchAirports(query: string, limit = 40): Airport[] {
  const q = `%${query.trim()}%`;
  const exact = query.trim().toUpperCase();
  return getDb()
    .prepare(
      `SELECT * FROM airports
       WHERE (name LIKE ? OR municipality LIKE ? OR iata_code = ? OR icao_code = ? OR ident = ?)
         AND type IN ${SERVICE_TYPES}
       ORDER BY scheduled_service DESC,
         CASE type WHEN 'large_airport' THEN 0 WHEN 'medium_airport' THEN 1 ELSE 2 END
       LIMIT ?`,
    )
    .all(q, q, exact, exact, exact, limit) as Airport[];
}

/** Nearest scheduled-service airports to a point, via bounding-box prefilter + haversine. */
export function nearestAirports(
  lat: number,
  lng: number,
  limit = 6,
): (Airport & { distance_km: number; bearing_deg: number; est_drive_min: number })[] {
  const d = 3; // ~330km box
  const toRad = (x: number) => (x * Math.PI) / 180;
  const toDeg = (x: number) => (x * 180) / Math.PI;
  // Longitude degrees per km shrink with latitude — widen the lng span by 1/cos(lat).
  const lngPad = d / Math.max(0.01, Math.cos(toRad(lat)));
  const rows = getDb()
    .prepare(
      `SELECT * FROM airports
       WHERE scheduled_service = 1 AND type IN ${SERVICE_TYPES}
         AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?`,
    )
    .all(lat - d, lat + d, lng - lngPad, lng + lngPad) as Airport[];

  const R = 6371;
  const phi1 = toRad(lat);
  return rows
    .map((a) => {
      const aLat = a.lat ?? 0;
      const aLng = a.lng ?? 0;
      const dLat = toRad(aLat - lat);
      const dLng = toRad(aLng - lng);
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(phi1) * Math.cos(toRad(aLat)) * Math.sin(dLng / 2) ** 2;
      const distance_km = Math.round(2 * R * Math.asin(Math.sqrt(h)));

      // Initial great-circle bearing from the query point to the airport.
      const phi2 = toRad(aLat);
      const y = Math.sin(dLng) * Math.cos(phi2);
      const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
      const bearing_deg = (toDeg(Math.atan2(y, x)) + 360) % 360;

      const est_drive_min = Math.round(distance_km * 1.35);
      return { ...a, distance_km, bearing_deg, est_drive_min };
    })
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit);
}
