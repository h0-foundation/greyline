import { getTravelAdvisories } from "$server/api-clients/travel-advisory";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getTravelAdvisories();
    if (!data) {
      return Response.json({ ok: false, disabled: true, error: "Travel-advisory connection is off" }, { status: 503 });
    }
    return Response.json({ ok: true, advisories: data });
  } catch (err) {
    // Never return a non-JSON body — the client parses JSON unconditionally.
    return fail("GET /api/advisories", err, "Advisory fetch failed.", 502);
  }
}
