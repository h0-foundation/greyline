import { proxyFetch } from '../services/api-gateway';

// GDACS global disaster alerts (earthquakes, cyclones, floods, volcanoes,
// wildfires, droughts). Free, no key, native GeoJSON.
export interface DisasterFeature {
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    eventtype: string; // EQ | TC | FL | VO | WF | DR
    name: string;
    htmldescription: string;
    alertlevel?: string; // Green | Orange | Red
    url?: { report?: string };
  };
}

export async function getDisasters(): Promise<DisasterFeature[] | null> {
  const result = await proxyFetch<{ features: DisasterFeature[] }>({
    apiId: "gdacs",
    url: "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP",
    cacheTtlSeconds: 600,
  });
  return result?.data?.features ?? null;
}
