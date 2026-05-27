import { getAllCountrySummaries } from "$server/db/repositories/knowledge";

// P0 smoke test: proves better-sqlite3 runs in a Next route handler (Node runtime).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const countries = getAllCountrySummaries();
    return Response.json({
      ok: true,
      db: "connected",
      countryProfiles: countries.length,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
