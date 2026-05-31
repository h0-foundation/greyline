import { getActiveFires } from "$server/api-clients/firms";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// NASA FIRMS active fires in the requested bbox. 503 when the connection is off
// OR no MAP_KEY is set (the gateway gates key-required connectors either way).
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const num = (k: string) => { const v = sp.get(k); return v === null || v === "" ? NaN : Number(v); };
    const west = num("west"), south = num("south"), east = num("east"), north = num("north");
    if (![west, south, east, north].every(Number.isFinite)) {
      return Response.json({ ok: false, error: "west, south, east, north are required." }, { status: 400 });
    }
    const fires = await getActiveFires({ west, south, east, north });
    if (!fires) return Response.json({ ok: false, disabled: true }, { status: 503 });
    return Response.json({ ok: true, fires });
  } catch (err) {
    return fail("GET /api/map/fires", err, "Could not load active-fire data.", 502);
  }
}
