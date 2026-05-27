import { getAircraftInArea } from "$server/api-clients/adsb";

export const dynamic = "force-dynamic";

// Live ADS-B aircraft near a point (adsb.lol, ODbL). 503 when the connection is off.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const lat = parseFloat(sp.get("lat") || "");
  const lon = parseFloat(sp.get("lon") || "");
  const dist = Math.min(250, parseInt(sp.get("dist") || "150", 10) || 150);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return Response.json({ ok: false, error: "lat & lon required" }, { status: 400 });
  }
  try {
    const aircraft = await getAircraftInArea(lat, lon, dist);
    if (!aircraft) return Response.json({ ok: false, disabled: true }, { status: 503 });
    return Response.json({ ok: true, aircraft });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
