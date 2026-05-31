import { geocode, reverseGeocode } from "$server/api-clients/nominatim";
import { searchCities, nearestCities } from "$server/db/repositories/geonames";

export const dynamic = "force-dynamic";

// Online geocoding is Nominatim (opt-in connector). When it's off or returns
// nothing, fall back to the OFFLINE GeoNames gazetteer so place lookup works
// air-gapped. Cities are shaped like a Nominatim result so consumers (the place
// picker) need no change.
type Geo = { place_id?: number; display_name: string; lat: string; lon: string; type?: string; address?: Record<string, string> };
function cityToGeo(c: { geonameid: number; name: string; admin1_code: string | null; country_code: string | null; lat: number; lng: number }): Geo {
  const display_name = [c.name, c.admin1_code, c.country_code].filter(Boolean).join(", ");
  return { place_id: c.geonameid, display_name, lat: String(c.lat), lon: String(c.lng), type: "city", address: { country_code: (c.country_code ?? "").toLowerCase() } };
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q");
  const lat = sp.get("lat");
  const lng = sp.get("lng");

  if (lat && lng) {
    const result = await reverseGeocode(parseFloat(lat), parseFloat(lng));
    if (result) return Response.json({ ok: true, result, source: "online" });
    const near = nearestCities(parseFloat(lat), parseFloat(lng), 1)[0];
    if (near) return Response.json({ ok: true, result: cityToGeo(near), source: "offline" });
    return Response.json({ ok: false, disabled: true }, { status: 503 });
  }

  if (!q) return Response.json({ ok: false, error: "q or lat/lng required" }, { status: 400 });

  const results = await geocode(q); // null when the connector is disabled
  if (results && results.length) return Response.json({ ok: true, results, source: "online" });

  const cities = searchCities(q, 6).map(cityToGeo);
  if (cities.length) return Response.json({ ok: true, results: cities, source: "offline" });

  if (results === null) return Response.json({ ok: false, disabled: true }, { status: 503 });
  return Response.json({ ok: true, results: [] });
}
