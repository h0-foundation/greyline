import { getDb } from "$server/db/index";

export const dynamic = "force-dynamic";

// Saved places the user can reuse across tools (weather, airports, etc.) without
// re-typing coordinates — drawn from logged trip destinations. Fully offline.
export async function GET() {
  const rows = getDb()
    .prepare(
      `SELECT COALESCE(NULLIF(d.city, ''), d.country_code) AS name, d.country_code, d.lat, d.lng, t.name AS trip
         FROM destinations d
         JOIN trips t ON t.id = d.trip_id
        WHERE d.lat IS NOT NULL AND d.lng IS NOT NULL AND d.lat != 0
        ORDER BY t.updated_at DESC, d.city`,
    )
    .all() as { name: string; country_code: string | null; lat: number; lng: number; trip: string }[];

  // De-dupe by rounded coordinate so the same city across trips appears once.
  const seen = new Set<string>();
  const places = [];
  for (const r of rows) {
    const key = `${r.lat.toFixed(2)},${r.lng.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({ label: r.name, country: r.country_code, lat: r.lat, lng: r.lng, trip: r.trip });
  }
  return Response.json({ ok: true, places });
}
