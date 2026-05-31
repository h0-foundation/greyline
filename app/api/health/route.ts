import { getAllCountrySummaries } from "$server/db/repositories/knowledge";
import { fail } from "@/lib/api";

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
    return fail("GET /api/health", err, "Health check failed.");
  }
}
