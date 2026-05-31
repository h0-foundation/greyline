import { proxyFetch } from '../services/api-gateway';

// US National Weather Service active alerts (api.weather.gov) — free, no key,
// native GeoJSON polygons. Public-domain US government data. Covers the US and
// its territories/marine zones; the layer is US-only by design.
export interface NwsAlertFeature {
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown } | null;
  properties: {
    event: string;       // e.g. "Tornado Warning"
    severity: string;    // Extreme | Severe | Moderate | Minor | Unknown
    urgency?: string;
    certainty?: string;
    headline?: string;
    areaDesc?: string;
    effective?: string;
    expires?: string;
  };
}

export async function getNwsAlerts(): Promise<NwsAlertFeature[] | null> {
  const result = await proxyFetch<{ features: NwsAlertFeature[] }>({
    apiId: "nws-alerts",
    url: "https://api.weather.gov/alerts/active",
    cacheTtlSeconds: 300,
  });
  // Only alerts with a drawable footprint are useful on the map.
  return result?.data?.features?.filter((f) => f.geometry != null) ?? null;
}
