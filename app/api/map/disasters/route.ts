import { getDisasters } from "$server/api-clients/gdacs";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// GDACS global disaster alerts. 503 when the connection is off.
export async function GET() {
  try {
    const disasters = await getDisasters();
    if (!disasters) return Response.json({ ok: false, disabled: true }, { status: 503 });
    return Response.json({ ok: true, disasters });
  } catch (err) {
    return fail("GET /api/map/disasters", err, "Could not load disaster data.", 502);
  }
}
