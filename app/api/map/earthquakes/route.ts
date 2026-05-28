import { getEarthquakes } from "$server/api-clients/usgs";

export const dynamic = "force-dynamic";

// USGS earthquakes (M2.5+, past day; public domain). 503 when the connection is off.
export async function GET() {
  try {
    const quakes = await getEarthquakes();
    if (!quakes) return Response.json({ ok: false, disabled: true }, { status: 503 });
    return Response.json({ ok: true, quakes });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
