import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpenText, Plane } from "lucide-react";
import {
  getTripById,
  getDestinationsByTrip,
} from "$server/db/repositories/trip";
import { getChecklistsByTrip } from "$server/db/repositories/checklist";
import { getThreatModelByTrip } from "$server/db/repositories/threat";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import {
  getCountryIntel,
  getCountryPractical,
  getVisaRequirement,
} from "$server/db/repositories/intel";
import {
  getAdvisoriesByCountry,
  getCountryIndices,
  getPeakAdvisories,
} from "$server/db/repositories/dossier";
import { getAirportsByCountry } from "$server/db/repositories/airports";
import { getAirportByIata } from "$server/db/repositories/airports";
import { getSetting } from "$server/db/repositories/settings";
import { getExchangeRates } from "$server/api-clients/exchange-rates";
import { getFlightsByTrip } from "$server/db/repositories/flight";
import { toListItem } from "@/lib/countries";
import { suggestThreatLevel, type ThreatLevel } from "@/lib/intel";
import { aggregateBriefing, type CountryProfileLite, type DestIntel, type DestPractical } from "@/lib/trip-briefing";
import { detectLayovers, enrichLayover, routeExposureScore, type AirportLite } from "@/lib/itinerary";
import { TripDetail } from "@/components/trip/trip-detail";
import { TripBriefing } from "@/components/trip/trip-briefing";
import { FlightsEditor } from "@/components/trip/flights-editor";
import { ItineraryPanel } from "@/components/trip/itinerary-panel";

export const dynamic = "force-dynamic";

type Destination = {
  id: string;
  country_code: string | null;
  city: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  sort_order: number;
  notes: string | null;
  lat: number | null;
  lng: number | null;
};

function parseCurrenciesJson(rc: string | null): string | null {
  if (!rc) return null;
  try {
    const obj = JSON.parse(rc) as { currencies?: Record<string, unknown> };
    const code = obj.currencies ? Object.keys(obj.currencies)[0] : null;
    return code ?? null;
  } catch { return null; }
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = getTripById(id) as
    | { id: string; name: string; status: string; start_date: string | null; end_date: string | null; notes: string | null }
    | undefined;
  if (!trip) notFound();

  const destinations = getDestinationsByTrip(id) as Destination[];
  const checklists = getChecklistsByTrip(id);
  const threatModel = getThreatModelByTrip(id);

  // Country list rows for both the destination picker (TripDetail) and the
  // briefing's flag/name lookup.
  const countryRows = getCountryListRows();
  const countries = countryRows.map((r) => toListItem(r.country_code, r.rest_countries));
  const countriesByIso = new Map<string, CountryProfileLite>();
  for (const c of countries) countriesByIso.set(c.code, { iso2: c.code, name: c.name, flag: c.flag });

  // Currency code per country (from REST Countries currencies JSON).
  const currencyByIso = new Map<string, string>();
  for (const r of countryRows) {
    const code = parseCurrenciesJson(r.rest_countries);
    if (code) currencyByIso.set(r.country_code, code);
  }

  // Home + home currency for the briefing's rate row.
  const home_iso2 = (getSetting("home_country") ?? "").replace(/"/g, "") || null;
  const homeCurrencyCode = home_iso2 ? currencyByIso.get(home_iso2) ?? null : null;

  // ── Build per-ISO maps for the aggregator ─
  const uniqIsos = new Set<string>();
  for (const d of destinations) if (d.country_code) uniqIsos.add(d.country_code.toUpperCase());

  const advisoriesByIso = new Map<string, ReturnType<typeof getAdvisoriesByCountry>>();
  const indicesByIso = new Map<string, NonNullable<ReturnType<typeof getCountryIndices>>>();
  const intelByIso = new Map<string, DestIntel>();
  const practicalByIso = new Map<string, DestPractical>();
  const visaByIso = new Map<string, { requirement: string; detail: string | null }>();
  const airportsByIso = new Map<string, Array<{ name: string; iata: string | null; icao: string | null }>>();

  for (const iso of uniqIsos) {
    advisoriesByIso.set(iso, getAdvisoriesByCountry(iso));
    const ix = getCountryIndices(iso);
    if (ix) indicesByIso.set(iso, ix);
    const itl = getCountryIntel(iso);
    intelByIso.set(iso, itl ? {
      photography_note: itl.photography_note,
      decryption_compulsion: itl.decryption_compulsion,
      sim_registration: itl.sim_registration,
      vpn_legality: itl.vpn_legality,
      apis_pnr_note: itl.apis_pnr_note,
      biometric_entry_note: itl.biometric_entry_note,
      lgbtq_legal_risk: itl.lgbtq_legal_risk,
    } : null);
    const pr = getCountryPractical(iso);
    practicalByIso.set(iso, pr ? {
      emergency_numbers: pr.emergency_numbers,
      plug_types: pr.plug_types,
      voltage: pr.voltage,
      driving_side: pr.driving_side,
      cash_declaration: pr.cash_declaration,
      idp_required: pr.idp_required,
    } : null);
    if (home_iso2) {
      const vs = getVisaRequirement(home_iso2, iso);
      if (vs) visaByIso.set(iso, { requirement: vs.requirement, detail: vs.detail });
    }
    const aps = getAirportsByCountry(iso, 6);
    airportsByIso.set(iso, aps.map((a) => ({ name: a.name, iata: a.iata_code, icao: a.icao_code })));
  }

  const peakByIso = getPeakAdvisories();

  // Currency rates — only attempt if home has a known currency.
  let rates: Record<string, number> | null = null;
  if (homeCurrencyCode) {
    try {
      const matrix = await getExchangeRates(homeCurrencyCode.toLowerCase());
      const base = matrix?.[homeCurrencyCode.toLowerCase()];
      if (base) {
        // Map per-country to local currency rate (i.e., 1 home unit = N local).
        const out: Record<string, number> = {};
        for (const [iso, cur] of currencyByIso) {
          const r = base[cur.toLowerCase()];
          if (typeof r === "number" && isFinite(r)) out[iso] = r;
        }
        rates = out;
      }
    } catch { rates = null; }
  }

  // ── Flights + layover analysis (server-side, pure functions) ─
  const flights = getFlightsByTrip(id);
  const allIatas = new Set<string>();
  for (const f of flights) {
    if (f.dep_iata) allIatas.add(f.dep_iata.toUpperCase());
    if (f.arr_iata) allIatas.add(f.arr_iata.toUpperCase());
  }
  const airportByIata = new Map<string, AirportLite>();
  for (const iata of allIatas) {
    const a = getAirportByIata(iata);
    if (a) airportByIata.set(iata, { iata: iata, name: a.name, iso_country: a.iso_country, municipality: a.municipality });
  }
  // Layovers are inter-flight gaps; enrichment pulls in country posture for each.
  const layoversRaw = detectLayovers(flights);
  const layovers = layoversRaw.map((l) =>
    enrichLayover(l, {
      airportByIata,
      visaForCountry: (iso2) => (home_iso2 ? getVisaRequirement(home_iso2, iso2) ?? null : null),
      advisoryLevelFor: (iso2) => peakByIso.get(iso2)?.level ?? null,
      intelFor: (iso2) => {
        const i = getCountryIntel(iso2);
        return i ? {
          sim_registration: i.sim_registration,
          decryption_compulsion: i.decryption_compulsion,
          apis_pnr_note: i.apis_pnr_note,
        } : null;
      },
    }),
  );
  const exposureScore = routeExposureScore(layovers);

  const briefingPayload = aggregateBriefing({
    destinations,
    countriesByIso,
    advisoriesByIso,
    peakByIso,
    indicesByIso,
    intelByIso,
    practicalByIso,
    visaByIso,
    airportsByIso,
    home: { iso2: home_iso2, currencyCode: homeCurrencyCode },
    rates,
  });

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

      {/* Flights + layover analysis — adding tickets lights up transit visa,
          tight-connection, and posture checks for every stop on the route. */}
      <section className="space-y-4">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground inline-flex items-center gap-2">
            <Plane className="size-4 text-faint" />
            Flights &amp; layovers
          </h2>
          <span className="font-mono text-xs text-faint">optional — add tickets to compute layover risk</span>
        </div>
        <FlightsEditor tripId={trip.id} initial={flights} />
        {layovers.length > 0 && (
          <ItineraryPanel layovers={layovers} exposureScore={exposureScore} />
        )}
      </section>

      {/* Auto-baked briefing — every tool's analysis, computed per destination,
          surfaced right next to the trip. */}
      <section className="space-y-4">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground inline-flex items-center gap-2">
            <BookOpenText className="size-4 text-faint" />
            Briefing
          </h2>
          <span className="font-mono text-xs text-faint">auto-generated from your dossier</span>
        </div>
        <TripBriefing payload={briefingPayload} />
      </section>
    </div>
  );
}
