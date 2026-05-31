import { proxyFetch } from '../services/api-gateway';

// EMSC (European-Mediterranean Seismological Centre) FDSN event feed — free, no
// key, native GeoJSON. Complements USGS with denser European/Mediterranean
// coverage. Routed through the gateway so it respects its own toggle + cache.
export interface EmscFeature {
  geometry: { type: "Point"; coordinates: [number, number, number] }; // [lon, lat, depth]
  properties: {
    mag: number;
    magtype?: string;
    depth?: number;
    flynn_region?: string; // human-readable region, e.g. "CRETE, GREECE"
    time?: string;
    auth?: string;
  };
}

export async function getEmscQuakes(): Promise<EmscFeature[] | null> {
  const result = await proxyFetch<{ features: EmscFeature[] }>({
    apiId: "emsc",
    url: "https://www.seismicportal.eu/fdsnws/event/1/query",
    params: { format: "json", limit: "300", minmag: "3" },
    cacheTtlSeconds: 300,
  });
  return result?.data?.features ?? null;
}
