import { notFound } from "next/navigation";
import Link from "next/link";
import { getTripById, getDestinationsByTrip } from "$server/db/repositories/trip";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import { getCountryIndices, getPeakAdvisories } from "$server/db/repositories/dossier";
import { getCountryPractical, getVisaRequirement } from "$server/db/repositories/intel";
import { getThreatModelByTrip } from "$server/db/repositories/threat";
import { getChecklistsByTrip } from "$server/db/repositories/checklist";
import { getSetting } from "$server/db/repositories/settings";
import { toListItem } from "@/lib/countries";
import { computeRiskScore } from "@/lib/risk-score";
import { getRoadSafety, roadBand } from "@/lib/road-safety";
import { computeItineraryReadiness } from "@/lib/iso31030";
import { epochDay, todayEpochDay } from "@/lib/visa";
import { PrintButton } from "@/components/trip/print-button";

export const dynamic = "force-dynamic";

const VISA_LABEL: Record<string, string> = {
  visa_free: "Visa-free",
  visa_on_arrival: "Visa on arrival",
  e_visa: "e-Visa required",
  eta: "ETA required",
  visa_required: "Visa required",
  no_admission: "No admission",
};

function checklistCounts(
  checklists: Array<{ type: string; items: string }>,
  type: string,
): { total: number; checked: number } | null {
  const c = checklists.find((x) => x.type === type);
  if (!c) return null;
  try {
    const items = JSON.parse(c.items) as Array<{ checked?: boolean }>;
    if (Array.isArray(items) && items.length > 0) {
      return { total: items.length, checked: items.filter((i) => i?.checked).length };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default async function BriefingPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = getTripById(id) as
    | { id: string; name: string; start_date: string | null; end_date: string | null }
    | undefined;
  if (!trip) notFound();

  const destinations = getDestinationsByTrip(id) as Array<{ country_code: string | null; city: string | null }>;
  const home_iso2 = (getSetting("home_country") ?? "").replace(/"/g, "") || null;
  const threatModel = getThreatModelByTrip(id);
  const checklists = getChecklistsByTrip(id) as Array<{ type: string; items: string }>;

  const nameFlag = new Map<string, { name: string; flag: string }>();
  for (const r of getCountryListRows()) {
    const c = toListItem(r.country_code, r.rest_countries);
    nameFlag.set(c.code, { name: c.name, flag: c.flag });
  }
  const peakByIso = getPeakAdvisories();

  const uniqIsos: string[] = [];
  for (const d of destinations) {
    const iso = (d.country_code ?? "").toUpperCase();
    if (iso && !uniqIsos.includes(iso)) uniqIsos.push(iso);
  }

  let visaRequiredCountries = 0;
  let severeAdvisoryCountries = 0;
  let countriesWithEmergencyInfo = 0;

  const rows = uniqIsos.map((iso) => {
    const indices = getCountryIndices(iso);
    const peak = peakByIso.get(iso) ?? null;
    const practical = getCountryPractical(iso);
    const visa = home_iso2 ? getVisaRequirement(home_iso2, iso) : null;
    const risk = computeRiskScore(indices, peak?.level ?? null);
    const road = getRoadSafety(iso);
    const meta = nameFlag.get(iso);

    if (visa && ["visa_required", "e_visa", "eta"].includes(visa.requirement)) visaRequiredCountries++;
    if ((peak?.level ?? 0) >= 3) severeAdvisoryCountries++;
    if (practical?.emergency_numbers) countriesWithEmergencyInfo++;

    return {
      iso,
      name: meta?.name ?? iso,
      flag: meta?.flag ?? "",
      risk,
      advisory: peak ? `Level ${peak.level}/4 — ${peak.level_label}` : null,
      road: road ? roadBand(road.ratePer100k).label : null,
      emergency: practical?.emergency_numbers ?? null,
      driving: practical?.driving_side ?? null,
      visa: visa ? VISA_LABEL[visa.requirement] ?? visa.requirement : null,
    };
  });

  const readiness = computeItineraryReadiness({
    today: todayEpochDay(),
    startDay: trip.start_date ? epochDay(trip.start_date) : null,
    endDay: trip.end_date ? epochDay(trip.end_date) : null,
    destinationsWithCountry: destinations.filter((d) => d.country_code).length,
    hasThreatModel: Boolean(threatModel),
    documents: checklistCounts(checklists, "documents"),
    packing: checklistCounts(checklists, "packing"),
    visaRequiredCountries,
    severeAdvisoryCountries,
    countriesWithEmergencyInfo,
    totalCountries: uniqIsos.length,
  });
  const pendingBefore = readiness.checks.filter((c) => c.phase === "before" && c.status === "pending");

  const dates = [trip.start_date, trip.end_date].filter(Boolean).join(" → ") || "Dates not set";

  return (
    <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 text-zinc-900 shadow-sm print:max-w-none print:p-0 print:shadow-none">
      <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
        <Link href={`/trips/${trip.id}`} className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Back to trip
        </Link>
        <PrintButton />
      </div>

      <header className="border-b border-zinc-200 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Greyline · pre-trip risk briefing</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">{trip.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">{dates}</p>
      </header>

      {/* Readiness summary */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Itinerary readiness (ISO 31030)</h2>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {readiness.score == null ? "—" : `${readiness.score}%`}
          <span className="ml-2 text-sm font-normal text-zinc-500">
            {readiness.applicable === 0 ? "nothing to prepare yet" : `${readiness.done} of ${readiness.applicable} ready`}
          </span>
        </p>
        {pendingBefore.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium text-zinc-700">Before you go:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-zinc-700">
              {pendingBefore.map((c) => (
                <li key={c.key}>
                  {c.label}
                  {c.detail && <span className="text-zinc-500"> — {c.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Per-destination risk table */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Destinations</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No destinations added.</p>
        ) : (
          <div className="mt-2 space-y-4">
            {rows.map((r) => (
              <div key={r.iso} className="break-inside-avoid rounded-md border border-zinc-200 p-4">
                <h3 className="font-display text-lg font-semibold">
                  {r.flag} {r.name}
                </h3>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                  <Field label="Greyline Risk Score" value={r.risk.score == null ? "Unavailable" : `${r.risk.score}/100 — ${r.risk.band}`} />
                  <Field label="Govt advisory" value={r.advisory ?? "Not bundled"} />
                  <Field label="Road safety" value={r.road ?? "Not available"} />
                  <Field label="Entry" value={r.visa ?? "Check requirements"} />
                  <Field label="Emergency" value={r.emergency ?? "—"} />
                  <Field label="Drives on" value={r.driving ?? "—"} />
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-8 border-t border-zinc-200 pt-4 text-xs text-zinc-400">
        Generated locally by Greyline — this briefing never left your machine. Risk Score is an open-methodology
        composite; advisories are the peak of bundled government sources. Verify against primary sources before travel.
      </footer>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="text-zinc-800">{value}</dd>
    </div>
  );
}
