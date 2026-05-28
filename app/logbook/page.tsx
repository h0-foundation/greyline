import Link from "next/link";
import { FileText, BookText, ArrowLeft, Compass, MapPin } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TravelAtlas } from "@/components/travel/travel-atlas";
import { Wrapped } from "@/components/travel/wrapped";
import { getAllTrips } from "$server/db/repositories/trip";
import {
  getTravelStats,
  getVisitedCountries,
  getTravelYears,
  getYearInReview,
} from "$server/db/repositories/travel";
import { getSetting } from "$server/db/repositories/settings";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import { computeOnThisDay } from "@/lib/on-this-day";
import { formatTripDate, type DatePrecision } from "@/lib/trip-format";

export const dynamic = "force-dynamic";

type Trip = {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  date_precision: string;
};

export default function LogbookPage() {
  const trips = getAllTrips() as Trip[];
  const wrapped = trips
    .filter((t) => t.status === "wrapped")
    .sort((a, b) => (b.end_date ?? "").localeCompare(a.end_date ?? ""));

  const stats = getTravelStats();
  const visited = getVisitedCountries();
  const home = (getSetting("home_country") ?? "").replace(/"/g, "");
  const knownCodes = getCountryListRows().map((r) => r.country_code);
  const reviews = getTravelYears().map((y) => getYearInReview(y)).filter((r) => r.hasData);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Logbook"
        description="Your lifetime travel log — wrapped trips, the visited atlas, and every year in review. The active planner lives at /trips."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
        <Link
          href="/trips"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-accent-text"
        >
          <ArrowLeft className="size-4" />
          Back to planning
        </Link>
        <Link
          href="/disclosure"
          className="inline-flex items-center gap-1.5 text-sm text-accent-text transition-colors hover:underline"
        >
          <FileText className="size-4" /> Disclosure-grade report
        </Link>
      </div>

      {reviews.length > 0 && <Wrapped reviews={reviews} />}

      <TravelAtlas
        stats={stats}
        visited={visited}
        onThisDay={computeOnThisDay(trips)}
        home={home}
        knownCodes={knownCodes}
      />

      <section className="space-y-4">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground inline-flex items-center gap-2">
            <BookText className="size-4 text-faint" />
            Wrapped trips
          </h2>
          <span className="font-mono text-xs text-faint tabular-nums">{wrapped.length}</span>
        </div>

        {wrapped.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No wrapped trips yet. Mark a trip as <em>wrapped</em> on its detail page and it lands here.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-border bg-card">
            {wrapped.map((t, i) => (
              <li key={t.id} className="border-b border-border last:border-b-0">
                <Link
                  href={`/trips/${t.id}`}
                  className="group relative flex items-center gap-4 py-3.5 pl-5 pr-4 transition-colors duration-[var(--duration-snap)] hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
                >
                  <span className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-primary transition-transform duration-[var(--duration-snap)] group-hover:scale-y-100" />
                  <span className="w-8 shrink-0 font-mono text-xs tabular-nums text-faint">
                    {String(wrapped.length - i).padStart(3, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground group-hover:text-accent-text">
                    {t.name}
                  </span>
                  <span className="hidden w-44 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground sm:block">
                    {formatTripDate(t.start_date, t.end_date, t.date_precision as DatePrecision) ?? "—"}
                  </span>
                  <Compass className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-accent-text" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Subtle footer hairline reinforcing the split. */}
      <p className="flex items-center gap-2 border-t border-border pt-4 text-xs text-faint">
        <MapPin className="size-3" />
        Everything here is a read-only archive. New plans + active operations live at <Link href="/trips" className="text-foreground hover:underline">/trips</Link>.
      </p>
    </div>
  );
}
