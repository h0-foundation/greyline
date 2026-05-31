import { getEarthquakes } from "$server/api-clients/usgs";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// USGS earthquakes (M2.5+, past day; public domain). 503 when the connection is off.
export async function GET() {
  try {
    const quakes = await getEarthquakes();
    if (!quakes) return Response.json({ ok: false, disabled: true }, { status: 503 });
    return Response.json({ ok: true, quakes });
  } catch (err) {
    return fail("GET /api/map/earthquakes", err, "Could not load earthquake data.", 502);
  }
}
