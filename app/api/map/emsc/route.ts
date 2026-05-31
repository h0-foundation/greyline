import { getEmscQuakes } from "$server/api-clients/emsc";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// EMSC European/Mediterranean earthquakes (no key). 503 when the connection is off.
export async function GET() {
  try {
    const quakes = await getEmscQuakes();
    if (!quakes) return Response.json({ ok: false, disabled: true }, { status: 503 });
    return Response.json({ ok: true, quakes });
  } catch (err) {
    return fail("GET /api/map/emsc", err, "Could not load EMSC earthquake data.", 502);
  }
}
