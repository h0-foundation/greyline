import { getAirStations } from "$server/api-clients/openaq";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// OpenAQ air-quality stations near a point. 503 when the connection is off OR no
// API key is set (the gateway gates key-required connectors either way).
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const num = (k: string) => { const v = sp.get(k); return v === null || v === "" ? NaN : Number(v); };
    const lat = num("lat"), lng = num("lng");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return Response.json({ ok: false, error: "lat and lng are required." }, { status: 400 });
    }
    const stations = await getAirStations(lat, lng);
    if (!stations) return Response.json({ ok: false, disabled: true }, { status: 503 });
    return Response.json({ ok: true, stations });
  } catch (err) {
    return fail("GET /api/map/air", err, "Could not load air-quality data.", 502);
  }
}
