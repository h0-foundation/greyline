import { getDisasters } from "$server/api-clients/gdacs";
import { getEarthquakes } from "$server/api-clients/usgs";
import {
  normalizeGdacs,
  normalizeUsgs,
  rationalize,
  type Alert,
} from "@/lib/alarm-rationalization";

export const dynamic = "force-dynamic";

// Rationalized hazard alert layer (EEMUA-191 style). Pulls the GDACS + USGS
// feeds (each behind its own connector toggle), normalises and de-duplicates
// them, prioritises by severity + proximity, and flood-suppresses per band.
// Optional ?lat=&lon=&radiusKm= focuses on the traveller. Returns enabled:false
// (200) when BOTH source connectors are off, so the client shows an offline
// state rather than an error.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  const radiusKm = Number(sp.get("radiusKm"));
  const minSeverity = Number(sp.get("minSeverity"));

  // getDisasters/getEarthquakes return null when their connector is off.
  const [disasters, quakes] = await Promise.all([
    getDisasters().catch(() => null),
    getEarthquakes().catch(() => null),
  ]);

  if (disasters === null && quakes === null) {
    return Response.json({ ok: true, enabled: false, result: null });
  }

  const alerts: Alert[] = [
    ...(disasters ? normalizeGdacs(disasters) : []),
    ...(quakes ? normalizeUsgs(quakes) : []),
  ];

  const origin =
    Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined;

  const result = rationalize(alerts, {
    origin,
    radiusKm: origin && Number.isFinite(radiusKm) ? radiusKm : undefined,
    minSeverity: Number.isFinite(minSeverity) ? minSeverity : 0,
  });

  return Response.json({ ok: true, enabled: true, result });
}
