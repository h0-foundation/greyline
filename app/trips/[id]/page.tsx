import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getTripById,
  getDestinationsByTrip,
} from "$server/db/repositories/trip";
import { getChecklistsByTrip } from "$server/db/repositories/checklist";
import { getThreatModelByTrip } from "$server/db/repositories/threat";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import { getCountryIntel } from "$server/db/repositories/intel";
import { toListItem } from "@/lib/countries";
import { suggestThreatLevel, type ThreatLevel } from "@/lib/intel";
import { TripDetail } from "@/components/trip/trip-detail";

export const dynamic = "force-dynamic";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = getTripById(id) as
    | { id: string; name: string; status: string; start_date: string | null; end_date: string | null; notes: string | null }
    | undefined;
  if (!trip) notFound();

  const destinations = getDestinationsByTrip(id) as Array<{
    id: string; country_code: string | null; city: string | null;
    arrival_date: string | null; departure_date: string | null; sort_order: number; notes: string | null;
  }>;
  const checklists = getChecklistsByTrip(id);
  const threatModel = getThreatModelByTrip(id);

  // Countries for the destination picker.
  const countries = getCountryListRows().map((r) => toListItem(r.country_code, r.rest_countries));

  // Per-destination intel + suggested level; trip suggestion = worst destination.
  const ORDER: ThreatLevel[] = ["routine", "elevated", "high", "extreme"];
  let worst = 0;
  const destIntel: Record<string, { suggested: ThreatLevel }> = {};
  for (const d of destinations) {
    if (!d.country_code) continue;
    const suggested = suggestThreatLevel(getCountryIntel(d.country_code));
    destIntel[d.id] = { suggested };
    worst = Math.max(worst, ORDER.indexOf(suggested));
  }
  const suggestedLevel = ORDER[worst];

  return (
    <div className="space-y-6">
      <Link href="/trips" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-accent-text">
        <ArrowLeft className="size-4" /> All trips
      </Link>
      <TripDetail
        trip={trip}
        destinations={destinations}
        checklists={checklists}
        threatModel={threatModel ?? null}
        countries={countries}
        destIntel={destIntel}
        suggestedLevel={suggestedLevel}
      />
    </div>
  );
}
