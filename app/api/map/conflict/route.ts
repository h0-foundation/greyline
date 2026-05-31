import { getConflictEvents } from "$server/db/repositories/conflict";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// UCDP armed-conflict events (bundled, offline). Always available — no connector
// toggle, no network. The map layer renders these as proportional markers.
export async function GET() {
  try {
    return Response.json({ ok: true, events: getConflictEvents() });
  } catch (err) {
    return fail("GET /api/map/conflict", err, "Could not load conflict data.", 500);
  }
}
