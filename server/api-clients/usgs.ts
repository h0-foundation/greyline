import { proxyFetch } from '../services/api-gateway';

// USGS earthquake feeds are public-domain GeoJSON, no key. We proxy them through
// the gateway so they respect the per-source toggle + cache + offline switch.
export interface QuakeFeature {
  type: "Feature";
  properties: { mag: number; place: string; time: number; url: string; tsunami: number };
  geometry: { type: "Point"; coordinates: [number, number, number] };
}

export async function getEarthquakes(): Promise<QuakeFeature[] | null> {
  const result = await proxyFetch<{ features: QuakeFeature[] }>({
    apiId: "usgs",
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
    cacheTtlSeconds: 300,
  });
  return result?.data?.features ?? null;
}
