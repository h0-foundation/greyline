/**
 * Pure logic + stable jurisdiction facts for the "Data footprint of flying"
 * personalized data-trail tool. No I/O here — the component fetches per-country
 * intel and hands it in via `intelByIso`. Information, not advice.
 */

// --- Per-country intel shape we actually consume (subset of CountryIntel) ----

export type FlyingIntel = {
  apis_pnr_note: string | null;
  biometric_entry_note: string | null;
  advisory_level: number | null;
  freedom_status: string | null; // 'Free' | 'Partly Free' | 'Not Free' | other
};

// --- Stable jurisdiction facts (curated constants) ---------------------------
// These are slow-moving legal/program facts, kept here rather than in the DB so
// the trail always has a baseline even when per-country intel is sparse.

/** PNR retention by destination/transit jurisdiction. */
export const PNR_RETENTION = {
  // EU PNR Directive (EU) 2016/681: PNR retained up to 5 years (depersonalized
  // after an initial 6-month period).
  EU: "Retained up to 5 years (EU PNR Directive 2016/681).",
  // US DHS/CBP Automated Targeting System: PNR retained up to 15 years.
  US: "Retained up to 15 years (US DHS/CBP).",
  // Fallback for states with their own (often multi-year) PNR regimes.
  OTHER: "Retained for years under the destination's own PNR program.",
} as const;

/** What APIS transmits — passport/advance passenger data sent before departure
 *  to destination (and frequently transit) border authorities. */
export const APIS_NOTE =
  "APIS transmits your passport machine-readable data (name, nationality, document number, date of birth) plus flight details to the destination — and often each transit country's — border authority before departure.";

/** EU biometric entry/exit baseline (when no per-country note is available). */
export const EES_ETIAS_NOTE =
  "EU Entry/Exit System (EES) records fingerprints + facial image at Schengen external borders; ETIAS pre-travel authorization is rolling out.";

/** US biometric (facial) entry/exit baseline. */
export const US_BIOMETRIC_NOTE =
  "US CBP runs facial-comparison biometric entry/exit at many airports; images of non-citizens may be retained long-term in DHS systems.";

/** Generic biometric fallback for other destinations. */
export const GENERIC_BIOMETRIC_NOTE =
  "Border control may capture biometrics (photo and/or fingerprints) and check you against watchlists on arrival.";

// --- EU/Schengen membership for retention + biometric routing ----------------
// EES/ETIAS apply to the Schengen external border; PNR Directive applies EU-wide.
// Kept minimal: enough to route the curated notes correctly.

const EU_PNR_ISO2 = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES",
  "SE",
]);

const SCHENGEN_BIOMETRIC_ISO2 = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IS", "IT", "LV", "LI", "LT", "LU", "MT", "NL", "NO", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", "CH",
]);

function retentionFor(iso2: string): string {
  const code = iso2.toUpperCase();
  if (code === "US") return PNR_RETENTION.US;
  if (EU_PNR_ISO2.has(code)) return PNR_RETENTION.EU;
  return PNR_RETENTION.OTHER;
}

function biometricBaselineFor(iso2: string): string {
  const code = iso2.toUpperCase();
  if (code === "US") return US_BIOMETRIC_NOTE;
  if (SCHENGEN_BIOMETRIC_ISO2.has(code)) return EES_ETIAS_NOTE;
  return GENERIC_BIOMETRIC_NOTE;
}

// --- Trail model -------------------------------------------------------------

export type StageKind = "booking" | "departure" | "arrival";

export type TrailStage = {
  stage: StageKind;
  /** ISO2 of the jurisdiction collecting at this node. */
  country: string;
  dataCollected: string[];
  authority: string;
  retention?: string;
  note?: string;
};

export type BuildTrailInput = {
  originIso2: string;
  destIso2: string;
  layovers: string[];
  intelByIso: Record<string, FlyingIntel | null | undefined>;
};

/** Build an ordered timeline of who collects your data at each stage. */
export function buildTrail(input: BuildTrailInput): TrailStage[] {
  const { originIso2, destIso2, layovers, intelByIso } = input;
  const stages: TrailStage[] = [];

  // Jurisdictions that receive booking/APIS data: destination + each transit.
  const recipients = [...layovers, destIso2].map((c) => c.toUpperCase());

  // 1. Booking — PNR created, shared with each destination/transit jurisdiction.
  for (const country of recipients) {
    const intel = intelByIso[country];
    const isTransit = country !== destIso2.toUpperCase();
    const data = [
      "Full booking record (PNR): itinerary, dates, contact details",
      "Payment method and travel-agent / booking-channel data",
      "Frequent-flyer number, seat, and reservation change history",
    ];
    stages.push({
      stage: "booking",
      country,
      authority: `${country} border / passenger authority${isTransit ? " (transit)" : ""}`,
      dataCollected: data,
      retention: retentionFor(country),
      note: intel?.apis_pnr_note ?? undefined,
    });
  }

  // 2. Check-in / departure — APIS passport data transmitted to dest + layovers.
  for (const country of recipients) {
    const isTransit = country !== destIso2.toUpperCase();
    stages.push({
      stage: "departure",
      country,
      authority: `${country} border authority${isTransit ? " (transit)" : ""}`,
      dataCollected: [
        "Passport machine-readable data: name, nationality, document number, DOB",
        "Flight number and departure / arrival airports",
      ],
      note: APIS_NOTE,
    });
  }

  // 3. Border / arrival — biometric entry at the destination (and any layover
  //    where you clear immigration).
  for (const country of [...layovers.map((c) => c.toUpperCase()), destIso2.toUpperCase()]) {
    const intel = intelByIso[country];
    const isTransit = country !== destIso2.toUpperCase();
    stages.push({
      stage: "arrival",
      country,
      authority: `${country} immigration / border control${isTransit ? " (transit)" : ""}`,
      dataCollected: [
        "Live facial image and/or fingerprints",
        "Entry/exit record matched against identity and watchlist systems",
      ],
      note: intel?.biometric_entry_note ?? biometricBaselineFor(country),
    });
  }

  return stages;
}

// --- Exposure score ----------------------------------------------------------

export type ExposureBand = "Low" | "Moderate" | "High";

export type ExposureResult = {
  score: number;
  band: ExposureBand;
  /** ISO2 of the single highest-risk leg, or null if no legs. */
  highestRiskLeg: string | null;
};

/** Per-leg risk contribution: base 1, scaled by advisory level + freedom status. */
function legScore(intel: FlyingIntel | null | undefined): number {
  let s = 1;
  if (intel?.advisory_level != null) s += (intel.advisory_level - 1) * 0.5;
  if (intel?.freedom_status === "Not Free") s += 2;
  else if (intel?.freedom_status === "Partly Free") s += 1;
  return s;
}

export function exposureScore(input: {
  originIso2: string;
  destIso2: string;
  layovers: string[];
  intelByIso: Record<string, FlyingIntel | null | undefined>;
}): ExposureResult {
  const { originIso2, destIso2, layovers, intelByIso } = input;
  const legs = [originIso2, ...layovers, destIso2]
    .map((c) => c.toUpperCase())
    .filter((c) => c.length === 2);

  let score = 0;
  let highestRiskLeg: string | null = null;
  let highest = -Infinity;

  for (const leg of legs) {
    const s = legScore(intelByIso[leg]);
    score += s;
    if (s > highest) {
      highest = s;
      highestRiskLeg = leg;
    }
  }

  // Bands scale with leg count so a long itinerary isn't auto-"High".
  const n = Math.max(legs.length, 1);
  const perLeg = score / n;
  const band: ExposureBand = perLeg >= 2.5 ? "High" : perLeg >= 1.75 ? "Moderate" : "Low";

  return { score: Math.round(score * 10) / 10, band, highestRiskLeg };
}
