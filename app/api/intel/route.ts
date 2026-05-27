import { getCountryIntel, getCountryPractical, getIntelCoverage } from "$server/db/repositories/intel";

export const dynamic = "force-dynamic";

// Curated per-country security/privacy posture + practical facts (offline, local
// SQLite). GET ?iso2=XX → one country; no param → the list of covered ISO2 codes.
export async function GET(req: Request) {
  const iso2 = new URL(req.url).searchParams.get("iso2");
  if (!iso2) {
    return Response.json({ ok: true, coverage: [...getIntelCoverage()] });
  }
  const intel = getCountryIntel(iso2);
  const practical = getCountryPractical(iso2);
  if (!intel && !practical) return Response.json({ ok: false, error: "no intel for country" }, { status: 404 });
  return Response.json({ ok: true, intel: intel ?? null, practical: practical ?? null });
}
