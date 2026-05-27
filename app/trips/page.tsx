import { PageHeader } from "@/components/page-header";
import { TripsClient } from "@/components/trip/trips-client";
import { TravelAtlas } from "@/components/travel/travel-atlas";
import { Wrapped } from "@/components/travel/wrapped";
import { getAllTrips } from "$server/db/repositories/trip";
import { getTravelStats, getVisitedCountries, getTravelYears, getYearInReview } from "$server/db/repositories/travel";
import { getSetting } from "$server/db/repositories/settings";

export const dynamic = "force-dynamic";

export type TripRow = {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  date_precision: string;
  updated_at: string;
};

function onThisDay(trips: TripRow[], visited: { country_code: string; name: string; flag: string }[]) {
  const today = new Date();
  const md = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const out: { name: string; flag: string; year: number; tripId: string }[] = [];
  for (const t of trips) {
    const d = t.start_date ?? t.end_date;
    if (!d || d.slice(5, 10) !== md) continue;
    out.push({ name: t.name, flag: "", year: Number(d.slice(0, 4)), tripId: t.id });
  }
  return out;
}

export default function TripsPage() {
  const trips = getAllTrips() as TripRow[];
  const stats = getTravelStats();
  const visited = getVisitedCountries();
  const home = (getSetting("home_country") ?? "").replace(/"/g, "");
  const reviews = getTravelYears().map((y) => getYearInReview(y)).filter((r) => r.hasData);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Trips"
        description="Your lifetime travel log — every trip, country, and day, stored only on this machine."
      />
      {reviews.length > 0 && <Wrapped reviews={reviews} />}
      <TravelAtlas stats={stats} visited={visited} onThisDay={onThisDay(trips, visited)} home={home} />
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">All trips</h2>
        <TripsClient initialTrips={trips} />
      </div>
    </div>
  );
}
