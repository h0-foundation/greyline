// Pure aggregation: turns raw trip + dossier reads into the structured payload
// the <TripBriefing/> view renders. Lives in lib/ (not /server) so it stays
// portable and unit-testable.

import type {
  AdvisoryRow,
  CountryIndices,
  PeakAdvisory,
} from "../server/db/repositories/dossier";
import type {
  BriefingDestination,
  DestinationBriefing,
  BriefingPayload,
} from "../components/trip/trip-briefing";

// Type for the curated intel rows (a narrowed copy of CountryIntel — keep this
// independent of the SQLite row shape so we don't leak DB-only nulls into UI).
export type DestIntel = DestinationBriefing["intel"];
export type DestPractical = DestinationBriefing["practical"];

export type CountryProfileLite = {
  iso2: string;
  name: string;
  flag: string;
};

export interface AggregatorInput {
  destinations: BriefingDestination[];
  countriesByIso: Map<string, CountryProfileLite>;
  advisoriesByIso: Map<string, AdvisoryRow[]>;
  peakByIso: Map<string, PeakAdvisory>;
  indicesByIso: Map<string, CountryIndices>;
  intelByIso: Map<string, DestIntel>;
  practicalByIso: Map<string, DestPractical>;
  visaByIso: Map<string, { requirement: string; detail: string | null }>;
  airportsByIso: Map<string, Array<{ name: string; iata: string | null; icao: string | null }>>;
  home: { iso2: string | null; currencyCode: string | null };
  rates: Record<string, number> | null;
}

export function aggregateBriefing(input: AggregatorInput): BriefingPayload {
  const enriched = input.destinations.map((d) => {
    const iso = (d.country_code ?? "").toUpperCase();
    const country = iso ? input.countriesByIso.get(iso) : undefined;
    const briefing: DestinationBriefing = {
      countryCode: iso || null,
      countryName: country?.name ?? d.city ?? "—",
      flag: country?.flag ?? "",
      advisories: iso ? input.advisoriesByIso.get(iso) ?? [] : [],
      peak: iso ? input.peakByIso.get(iso) ?? null : null,
      indices: iso ? input.indicesByIso.get(iso) ?? null : null,
      intel: iso ? input.intelByIso.get(iso) ?? null : null,
      practical: iso ? input.practicalByIso.get(iso) ?? null : null,
      visa: iso ? input.visaByIso.get(iso) ?? null : null,
      airports: iso ? input.airportsByIso.get(iso) ?? [] : [],
    };
    return { ...d, briefing };
  });

  return {
    destinations: enriched,
    home: input.home,
    rates: input.rates,
    preDeparture: buildPreDeparture(enriched, input.home),
  };
}

function buildPreDeparture(
  destinations: Array<BriefingDestination & { briefing: DestinationBriefing }>,
  home: { iso2: string | null; currencyCode: string | null },
): string[] {
  const out: string[] = [];
  const seenVisa = new Set<string>();
  const seenIdp = new Set<string>();
  const seenSim = new Set<string>();
  const seenUnlock = new Set<string>();

  for (const d of destinations) {
    const b = d.briefing;
    const cname = b.countryName;

    // Severe advisory
    if (b.peak && b.peak.level >= 3) {
      out.push(`${cname}: ${b.peak.level_label}. Review the source link before booking — or reroute.`);
    }

    // Visa
    if (b.visa) {
      const req = b.visa.requirement;
      if ((req === "visa_required" || req === "e_visa" || req === "eta") && !seenVisa.has(cname)) {
        seenVisa.add(cname);
        const which = req === "e_visa" ? "an e-visa" : req === "eta" ? "an ETA" : "a visa";
        out.push(`Apply for ${which} for ${cname}${home.iso2 ? ` (passport: ${home.iso2})` : ""}.`);
      }
      if (req === "no_admission") out.push(`${cname} does not admit holders of your passport.`);
    }

    // Driving / IDP
    if (b.practical?.idp_required === 1 && !seenIdp.has(cname)) {
      seenIdp.add(cname);
      out.push(`Carry an International Driving Permit for ${cname}.`);
    }

    // SIM registration
    if ((b.intel?.sim_registration === "required" || b.intel?.sim_registration === "biometric") && !seenSim.has(cname)) {
      seenSim.add(cname);
      out.push(
        `Local SIM in ${cname} requires ${b.intel.sim_registration === "biometric" ? "biometric" : "ID"} registration. Decide before travel.`,
      );
    }

    // Device unlock at the border
    if ((b.intel?.decryption_compulsion === "yes" || b.intel?.decryption_compulsion === "possible") && !seenUnlock.has(cname)) {
      seenUnlock.add(cname);
      out.push(
        `${cname} border may compel device unlock${b.intel.decryption_compulsion === "yes" ? " (legal authority on the books)" : " (cases on record)"}. Travel with a clean device profile.`,
      );
    }

    // Cash declaration
    if (b.practical?.cash_declaration) {
      out.push(`Declare cash entering ${cname} over ${b.practical.cash_declaration}.`);
    }

    // LGBTQ legal risk
    if (b.intel?.lgbtq_legal_risk === "high" || b.intel?.lgbtq_legal_risk === "severe") {
      out.push(`${cname}: LGBTQ+ legal risk is ${b.intel.lgbtq_legal_risk}. Plan personal-safety accordingly.`);
    }
  }

  // Generic always-on items
  if (destinations.length > 0) {
    out.push("Strip EXIF from photos before sharing — /tools/exif handles it locally.");
    out.push("Confirm passport ≥ 6 months validity past your latest departure.");
  }

  return out;
}
