import { geocode, reverseGeocode } from "$server/api-clients/nominatim";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q");
  const lat = sp.get("lat");
  const lng = sp.get("lng");
  if (lat && lng) {
    const result = await reverseGeocode(parseFloat(lat), parseFloat(lng));
    if (!result) return Response.json({ ok: false, disabled: true }, { status: 503 });
    return Response.json({ ok: true, result });
  }
  if (!q) return Response.json({ ok: false, error: "q or lat/lng required" }, { status: 400 });
  const results = await geocode(q);
  if (!results) return Response.json({ ok: false, disabled: true }, { status: 503 });
  return Response.json({ ok: true, results });
}
