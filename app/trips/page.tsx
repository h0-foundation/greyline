import Link from "next/link";
import { BookText, ArrowRight, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PlanningList, type PlanningTrip } from "@/components/trip/planning-list";
import { getAllTrips, getDestinationsByTrip } from "$server/db/repositories/trip";
import { getChecklistsByTrip } from "$server/db/repositories/checklist";
import { getFlightsByTrip } from "$server/db/repositories/flight";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import { getPeakAdvisories } from "$server/db/repositories/dossier";
import { toListItem } from "@/lib/countries";

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

type Destination = {
  id: string;
  country_code: string | null;
  city: string | null;
  arrival_date: string | null;
  departure_date: string | null;
};

function checklistPct(items: string): number {
  try {
    const arr = JSON.parse(items) as Array<{ checked: boolean }>;
    if (arr.length === 0) return 0;
    return Math.round((arr.filter((i) => i.checked).length / arr.length) * 100);
  } catch { return 0; }
}

function daysUntil(start: string | null): number | null {
  if (!start) return null;
  const t = Date.parse(start);
  if (!Number.isFinite(t)) return null;
  return Math.round((t - Date.now()) / 86400000);
}

export default function TripsPage() {
  const all = getAllTrips() as TripRow[];
  const planning = all.filter((t) => t.status !== "wrapped");
  const wrappedCount = all.length - planning.length;

  // Country flag lookup for destination chips.
  const countryRows = getCountryListRows();
  const flagByIso = new Map<string, string>();
  for (const r of countryRows) {
    const c = toListItem(r.country_code, r.rest_countries);
    if (c.flag) flagByIso.set(c.code, c.flag);
  }

  const peaks = getPeakAdvisories();

  const enriched: PlanningTrip[] = planning.map((t) => {
    const destinations = getDestinationsByTrip(t.id) as Destination[];
    const flights = getFlightsByTrip(t.id);
    const carriers = new Set(flights.map((f) => (f.carrier_iata ?? "").toUpperCase()).filter(Boolean));
    const checklists = getChecklistsByTrip(t.id);
    const pack = checklists.find((c) => c.type === "packing");
    const docs = checklists.find((c) => c.type === "documents");
    const flags = destinations
      .map((d) => (d.country_code ? flagByIso.get(d.country_code) ?? "" : ""))
      .filter(Boolean);
    // Peak advisory across destinations.
    let peakLevel: number | null = null;
    for (const d of destinations) {
      if (!d.country_code) continue;
      const p = peaks.get(d.country_code.toUpperCase());
      if (p && (peakLevel == null || p.level > peakLevel)) peakLevel = p.level;
    }
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      start_date: t.start_date,
      end_date: t.end_date,
      date_precision: t.date_precision,
      destinations_count: destinations.length,
      destination_flags: flags,
      flights_count: flights.length,
      carriers_count: carriers.size,
      packing_pct: pack ? checklistPct(pack.items) : null,
      docs_pct: docs ? checklistPct(docs.items) : null,
      peak_advisory_level: peakLevel,
      days_until: daysUntil(t.start_date),
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Trips"
        description="Plan and operate. Active and upcoming trips live here — your lifetime logbook is one click away."
      />

      <PlanningList initialTrips={enriched} />

      {/* Hairline link to the archive — the moment you wrap a trip it shows up there. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Link
          href="/logbook"
          className="surface-interactive group inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-accent-text"
        >
          <BookText className="size-4 text-faint" />
          <span>
            Logbook
            {wrappedCount > 0 && (
              <span className="ml-1.5 font-mono text-xs text-faint tabular-nums">
                · {wrappedCount} wrapped
              </span>
            )}
          </span>
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/disclosure"
          className="inline-flex items-center gap-1.5 text-sm text-accent-text transition-colors hover:underline"
        >
          <FileText className="size-4" /> Disclosure-grade report
        </Link>
      </div>
    </div>
  );
}
