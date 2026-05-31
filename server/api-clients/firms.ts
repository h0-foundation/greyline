import { proxyFetch } from '../services/api-gateway';

// NASA FIRMS active-fire detections (VIIRS S-NPP, near-real-time). Free, but
// needs a personal MAP_KEY which FIRMS carries as a URL *path* segment — the
// gateway injects it via auth.in="path" and keeps it out of the cache key.
// Scoped to a bounding box so the response stays small.
export interface FirePoint {
  lat: number;
  lng: number;
  frp: number;          // fire radiative power (MW) — intensity proxy
  confidence: string;   // VIIRS: l / n / h
  acq_date: string;
  acq_time: string;
  daynight: string;     // D / N
}

export function parseFireCsv(csv: string): FirePoint[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].split(",");
  const ix = (name: string) => header.indexOf(name);
  const cLat = ix("latitude"), cLng = ix("longitude"), cFrp = ix("frp"),
    cConf = ix("confidence"), cDate = ix("acq_date"), cTime = ix("acq_time"), cDn = ix("daynight");
  if (cLat < 0 || cLng < 0) return [];
  const out: FirePoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const r = lines[i].split(",");
    const lat = parseFloat(r[cLat]);
    const lng = parseFloat(r[cLng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({
      lat, lng,
      frp: parseFloat(r[cFrp]) || 0,
      confidence: r[cConf] ?? "",
      acq_date: r[cDate] ?? "",
      acq_time: r[cTime] ?? "",
      daynight: r[cDn] ?? "",
    });
  }
  return out;
}

/** Active fires in a bounding box (west,south,east,north) over the past `days`. */
export async function getActiveFires(bbox: { west: number; south: number; east: number; north: number }, days = 1): Promise<FirePoint[] | null> {
  const area = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
  const result = await proxyFetch<string>({
    apiId: "nasa-firms",
    url: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{KEY}/VIIRS_SNPP_NRT/${area}/${days}`,
    auth: { in: "path", name: "{KEY}" },
    cacheTtlSeconds: 1800,
  });
  if (result?.data == null) return null;
  return parseFireCsv(result.data);
}
