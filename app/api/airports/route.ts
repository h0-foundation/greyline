import { searchAirports, getAirportsByCountry } from "$server/db/repositories/airports";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q");
  const country = sp.get("country");
  if (country) return Response.json(getAirportsByCountry(country, 100));
  if (q && q.trim().length >= 2) return Response.json(searchAirports(q, 40));
  return Response.json([]);
}
