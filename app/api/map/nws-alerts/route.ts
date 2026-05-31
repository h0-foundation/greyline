import { getNwsAlerts } from "$server/api-clients/nws";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// US NWS active weather alerts (no key) as GeoJSON. 503 when the connection is off.
export async function GET() {
  try {
    const alerts = await getNwsAlerts();
    if (!alerts) return Response.json({ ok: false, disabled: true }, { status: 503 });
    return Response.json({ ok: true, alerts });
  } catch (err) {
    return fail("GET /api/map/nws-alerts", err, "Could not load NWS weather alerts.", 502);
  }
}
