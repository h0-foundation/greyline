import { NextRequest } from "next/server";
import { getAllTrips } from "$server/db/repositories/trip";
import { getSetting } from "$server/db/repositories/settings";
import { getDb } from "$server/db/index";
import {
  computeDisclosure,
  toJSON,
  toMarkdown,
  type DestinationRow,
  type TripRow,
  type CountryMeta,
} from "@/lib/disclosure";

export const dynamic = "force-dynamic";

function loadCountryMeta(): Map<string, CountryMeta> {
  const rows = getDb()
    .prepare(`SELECT country_code, rest_countries FROM country_profiles`)
    .all() as Array<{ country_code: string; rest_countries: string | null }>;
  const map = new Map<string, CountryMeta>();
  for (const r of rows) {
    if (!r.rest_countries) continue;
    try {
      const rc = JSON.parse(r.rest_countries) as { name?: { common?: string }; region?: string };
      map.set(r.country_code, {
        name: rc?.name?.common ?? r.country_code,
        region: rc?.region ?? "Unknown",
      });
    } catch {
      /* malformed — keep skipping */
    }
  }
  return map;
}

function loadAllDestinations(): DestinationRow[] {
  return getDb()
    .prepare(
      `SELECT id, trip_id, country_code, arrival_date, departure_date, notes FROM destinations`,
    )
    .all() as DestinationRow[];
}

export async function GET(req: NextRequest) {
  const format = (req.nextUrl.searchParams.get("format") ?? "md").toLowerCase();
  const trips = getAllTrips() as TripRow[];
  const destinations = loadAllDestinations();
  const countries = loadCountryMeta();
  const home = (getSetting("home_country") ?? "").replace(/"/g, "");
  const report = computeDisclosure(trips, destinations, countries, home || null);
  const date = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    return new Response(toJSON(report), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="greyline-disclosure-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(toMarkdown(report), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="greyline-disclosure-${date}.md"`,
      "Cache-Control": "no-store",
    },
  });
}
