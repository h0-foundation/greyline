import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TripsClient } from "@/components/trip/trips-client";
import { TravelAtlas } from "@/components/travel/travel-atlas";
import { Wrapped } from "@/components/travel/wrapped";
import { getAllTrips } from "$server/db/repositories/trip";
import { getTravelStats, getVisitedCountries, getTravelYears, getYearInReview } from "$server/db/repositories/travel";
import { getSetting } from "$server/db/repositories/settings";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import { computeOnThisDay } from "@/lib/on-this-day";

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

export default function TripsPage() {
  const trips = getAllTrips() as TripRow[];
  const stats = getTravelStats();
  const visited = getVisitedCountries();
  const home = (getSetting("home_country") ?? "").replace(/"/g, "");
  const knownCodes = getCountryListRows().map((r) => r.country_code);
  const reviews = getTravelYears().map((y) => getYearInReview(y)).filter((r) => r.hasData);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Trips"
        description="Your lifetime travel log — every trip, country, and day, stored only on this machine."
      />
      <div className="flex justify-end">
        <Link
          href="/disclosure"
          className="inline-flex items-center gap-1.5 text-sm text-accent-text transition-colors hover:underline"
        >
          <FileText className="size-4" /> Disclosure-grade report
        </Link>
      </div>
      {reviews.length > 0 && <Wrapped reviews={reviews} />}
      <TravelAtlas stats={stats} visited={visited} onThisDay={computeOnThisDay(trips)} home={home} knownCodes={knownCodes} />
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">All trips</h2>
        <TripsClient initialTrips={trips} />
      </div>
    </div>
  );
}
