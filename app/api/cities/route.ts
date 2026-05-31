import { searchCities, getCitiesByCountry, nearestCities } from "$server/db/repositories/geonames";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// Offline GeoNames gazetteer lookup: ?q=name | ?country=ISO2 | ?lat&lng (nearest).
// Fully on-device — no connector, works air-gapped.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  try {
    const lat = sp.get("lat");
    const lng = sp.get("lng");
    if (lat && lng) {
      const la = parseFloat(lat);
      const ln = parseFloat(lng);
      if (Number.isNaN(la) || Number.isNaN(ln)) return Response.json({ ok: false, error: "invalid lat/lng" }, { status: 400 });
      return Response.json({ ok: true, cities: nearestCities(la, ln, 5) });
    }
    const country = sp.get("country");
    if (country) return Response.json({ ok: true, cities: getCitiesByCountry(country, 50) });
    const q = sp.get("q");
    if (q) return Response.json({ ok: true, cities: searchCities(q, 20) });
    return Response.json({ ok: false, error: "q, country, or lat/lng required" }, { status: 400 });
  } catch (err) {
    return fail("GET /api/cities", err, "Could not look up cities.");
  }
}
