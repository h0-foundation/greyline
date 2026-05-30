import Link from "next/link";
import { ArrowDownToLine, FileText, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getAllTrips } from "$server/db/repositories/trip";
import { getSetting } from "$server/db/repositories/settings";
import { getDb } from "$server/db/index";
import {
  computeDisclosure,
  type CountryMeta,
  type DestinationRow,
  type TripRow,
} from "@/lib/disclosure";
import { computePatternOfLife } from "@/lib/pattern-of-life";
import { PatternOfLifeCard } from "@/components/intel/pattern-of-life";

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
      /* malformed — skip */
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

export default function DisclosurePage() {
  const trips = getAllTrips() as TripRow[];
  const destinations = loadAllDestinations();
  const countries = loadCountryMeta();
  const home = (getSetting("home_country") ?? "").replace(/"/g, "");
  const report = computeDisclosure(trips, destinations, countries, home || null);
  const pol = computePatternOfLife(trips, destinations, countries);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Disclosure report"
        description="A disclosure-grade summary of your foreign travel — the 7-year rolling window the U.S. government's SF-86 asks for, plus the lifetime country tally. Computed locally; this page is the only place it exists."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Window" value={`${report.window.start.slice(2)} → ${report.window.end.slice(2)}`} />
        <Stat label="Foreign trips" value={String(report.stats.total_foreign_trips_in_window)} />
        <Stat label="Foreign days" value={String(report.stats.total_foreign_days_in_window)} />
        <Stat label="Countries in window" value={String(report.stats.countries_visited_in_window)} />
      </div>

      {/* Export */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-faint" />
          Export the report — nothing leaves your machine.
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <a
            href="/api/disclosure?format=md"
            download
            className="surface-interactive inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-primary/30 hover:text-accent-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <ArrowDownToLine className="size-4" /> Markdown
          </a>
          <a
            href="/api/disclosure?format=json"
            download
            className="surface-interactive inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-primary/30 hover:text-accent-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <FileText className="size-4" /> JSON
          </a>
        </div>
      </div>

      {/* Pattern-of-life self-audit — how identifying your own record is. */}
      <section className="space-y-3">
        <h2 className="label-caps">What your record reveals</h2>
        <PatternOfLifeCard pol={pol} />
      </section>

      {/* In-window foreign travel */}
      <section className="space-y-3">
        <h2 className="label-caps">Foreign travel · past {report.window.years} years</h2>
        {report.foreign_travel.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No foreign travel within the disclosure window.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr className="label-caps">
                  <th className="px-4 py-2.5 font-semibold">Country</th>
                  <th className="px-4 py-2.5 font-semibold">Code</th>
                  <th className="px-4 py-2.5 font-semibold">Arrival</th>
                  <th className="px-4 py-2.5 font-semibold">Departure</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Days</th>
                  <th className="px-4 py-2.5 font-semibold">Trip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.foreign_travel.map((e, i) => (
                  <tr key={`${e.trip_id}-${e.country_code}-${i}`}>
                    <td className="px-4 py-2.5 text-foreground">
                      <Link href={`/countries/${e.country_code}`} className="transition-colors hover:text-accent-text">
                        {e.country_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-faint">{e.country_code}</td>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-faint">{e.arrival ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-faint">{e.departure ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums">{e.days}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <Link href={`/trips/${e.trip_id}`} className="transition-colors hover:text-accent-text">
                        {e.trip_name}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Lifetime */}
      <section className="space-y-3">
        <h2 className="label-caps">
          Lifetime country summary · {report.lifetime_countries.length} countr{report.lifetime_countries.length === 1 ? "y" : "ies"}
        </h2>
        {report.lifetime_countries.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No foreign travel on record.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr className="label-caps">
                  <th className="px-4 py-2.5 font-semibold">Country</th>
                  <th className="px-4 py-2.5 font-semibold">Region</th>
                  <th className="px-4 py-2.5 font-semibold">First</th>
                  <th className="px-4 py-2.5 font-semibold">Last</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Trips</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.lifetime_countries.map((c) => (
                  <tr key={c.country_code}>
                    <td className="px-4 py-2.5">
                      <Link href={`/countries/${c.country_code}`} className="transition-colors hover:text-accent-text">
                        <span className="text-foreground">{c.country_name}</span>{" "}
                        <span className="font-mono text-xs text-faint">{c.country_code}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.region}</td>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-faint">{c.first_visit ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-faint">{c.last_visit ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums">{c.total_trips}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums">{c.total_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-pretty text-xs text-muted-foreground">
        This is a personal record. It is <strong>not</strong> a filed government form, and Greyline is
        not government-affiliated. The 7-year window matches the SF-86 Section 20C definition for
        security-clearance disclosure; many people use the same rolling window for tax residency,
        expatriate accounting, or travel-day audits. All computation is local; the export downloads
        from your own machine.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="label-caps">{label}</div>
      <div className="mt-2 font-mono text-lg tabular-nums text-foreground">{value}</div>
    </div>
  );
}
