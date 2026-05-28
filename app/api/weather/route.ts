import { getWeather } from "$server/api-clients/open-meteo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const lat = parseFloat(sp.get("lat") || "");
  const lng = parseFloat(sp.get("lng") || "");
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return Response.json({ ok: false, error: "lat and lng are required" }, { status: 400 });
  }
  try {
    const data = await getWeather(lat, lng);
    if (!data) {
      return Response.json({ ok: false, disabled: true, error: "Weather connection is off" }, { status: 503 });
    }
    return Response.json({ ok: true, weather: data });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Weather fetch failed" }, { status: 502 });
  }
}
