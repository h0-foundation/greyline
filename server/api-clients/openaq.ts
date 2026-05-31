import { proxyFetch } from '../services/api-gateway';

// OpenAQ v3 air-quality monitoring stations. Free, needs a personal key in the
// X-API-Key header (clean fit for the gateway's auth.in="header"). We surface
// nearby stations + the parameters each measures; defensively parsed since the
// exact v3 shape can evolve.
export interface AirStation {
  id: number;
  name: string;
  locality: string | null;
  country: string | null;
  lat: number;
  lng: number;
  parameters: string[]; // e.g. ["pm25", "pm10", "no2"]
}

export interface OpenAqLocation {
  id?: number;
  name?: string;
  locality?: string | null;
  country?: { name?: string; code?: string } | string | null;
  coordinates?: { latitude?: number; longitude?: number } | null;
  sensors?: { parameter?: { name?: string } }[] | null;
}

export function normalizeStation(r: OpenAqLocation): AirStation | null {
  const lat = r.coordinates?.latitude;
  const lng = r.coordinates?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const country = typeof r.country === "string" ? r.country : r.country?.name ?? r.country?.code ?? null;
  const parameters = (r.sensors ?? [])
    .map((s) => s.parameter?.name)
    .filter((p): p is string => Boolean(p));
  return {
    id: r.id ?? 0,
    name: r.name ?? "Monitoring station",
    locality: r.locality ?? null,
    country,
    lat, lng,
    parameters: [...new Set(parameters)],
  };
}

/** Air-quality stations within `radius` metres of a point (max 25 km per OpenAQ). */
export async function getAirStations(lat: number, lng: number, radius = 25000, limit = 100): Promise<AirStation[] | null> {
  const result = await proxyFetch<{ results?: OpenAqLocation[] }>({
    apiId: "openaq",
    url: "https://api.openaq.org/v3/locations",
    params: { coordinates: `${lat},${lng}`, radius: String(Math.min(25000, radius)), limit: String(limit) },
    auth: { in: "header", name: "X-API-Key" },
    cacheTtlSeconds: 900,
  });
  if (result?.data == null) return null;
  return (result.data.results ?? []).map(normalizeStation).filter((s): s is AirStation => s !== null);
}
