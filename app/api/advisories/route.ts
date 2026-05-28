import { getTravelAdvisories } from "$server/api-clients/travel-advisory";

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
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Advisory fetch failed" },
      { status: 502 },
    );
  }
}
