/* ISO 31030 itinerary readiness — pure, offline, dependency-free.
 *
 * ISO 31030:2021 ("Travel risk management — Guidance for organizations") frames a
 * trip as a lifecycle rather than a single booking. Greyline maps the signals it
 * already computes (itinerary, documents, packing, threat assessment, visas,
 * advisories, emergency contacts) onto a before / during / after lifecycle and
 * scores pre-departure readiness over the actionable "before" checks.
 *
 * Honest by construction: a check is only "done" when its underlying data says
 * so — nothing auto-completes, and items that don't apply are excluded from the
 * score rather than counted as passed. "ISO 31030-aligned" describes the lifecycle
 * framing; it is not a certification claim. */

export type Phase = "before" | "during" | "after";
export type CheckStatus = "done" | "pending" | "na";

export interface ReadinessCheck {
  key: string;
  phase: Phase;
  label: string;
  status: CheckStatus;
  detail?: string;
}

export interface ItineraryReadiness {
  checks: ReadinessCheck[];
  /** 0-100 over actionable (done|pending) "before" checks; null when none apply */
  score: number | null;
  done: number;
  pending: number;
  applicable: number;
  /** which lifecycle phase today falls in, relative to the trip dates */
  currentPhase: Phase;
}

export interface ReadinessInput {
  /** epoch day (see lib/visa epochDay); null is treated as pre-trip */
  today: number | null;
  startDay: number | null;
  endDay: number | null;
  destinationsWithCountry: number;
  hasThreatModel: boolean;
  /** auto-generated checklists; null when the trip has none */
  documents: { total: number; checked: number } | null;
  packing: { total: number; checked: number } | null;
  visaRequiredCountries: number;
  severeAdvisoryCountries: number;
  countriesWithEmergencyInfo: number;
  totalCountries: number;
}

export const PHASE_LABEL: Record<Phase, string> = {
  before: "Before — plan & prepare",
  during: "During — in country",
  after: "After — return & review",
};

function phaseFor(today: number | null, start: number | null, end: number | null): Phase {
  if (today == null || start == null) return "before";
  if (today < start) return "before";
  if (end != null && today > end) return "after";
  return "during";
}

/** done when fully checked, pending when partial/empty, na when the list is absent. */
function checklistStatus(c: { total: number; checked: number } | null): { status: CheckStatus; detail?: string } {
  if (!c || c.total === 0) return { status: "na" };
  if (c.checked >= c.total) return { status: "done", detail: `${c.total} / ${c.total}` };
  return { status: "pending", detail: `${c.checked} / ${c.total}` };
}

export function computeItineraryReadiness(input: ReadinessInput): ItineraryReadiness {
  const checks: ReadinessCheck[] = [];

  // ── Before — the scored, data-driven readiness checks ──────────────────────
  checks.push({
    key: "itinerary",
    phase: "before",
    label: "Itinerary defined",
    status: input.destinationsWithCountry > 0 ? "done" : "pending",
    detail: input.destinationsWithCountry > 0 ? `${input.destinationsWithCountry} destination(s)` : "Add at least one destination",
  });
  checks.push({
    key: "dates",
    phase: "before",
    label: "Travel dates set",
    status: input.startDay != null && input.endDay != null ? "done" : "pending",
  });
  checks.push({
    key: "threat",
    phase: "before",
    label: "Threat assessment recorded",
    status: input.hasThreatModel ? "done" : "pending",
  });
  const docs = checklistStatus(input.documents);
  checks.push({ key: "documents", phase: "before", label: "Documents prepared", ...docs });
  const pack = checklistStatus(input.packing);
  checks.push({ key: "packing", phase: "before", label: "Packing prepared", ...pack });
  checks.push({
    key: "visas",
    phase: "before",
    label: "Entry permissions resolved",
    status: input.visaRequiredCountries === 0 ? "na" : "pending",
    detail: input.visaRequiredCountries === 0
      ? "No visa required for your passport"
      : `${input.visaRequiredCountries} destination(s) need a visa / e-visa / ETA`,
  });
  checks.push({
    key: "advisories",
    phase: "before",
    label: "Advisories reviewed",
    status: input.severeAdvisoryCountries > 0 ? "pending" : input.totalCountries > 0 ? "done" : "na",
    detail: input.severeAdvisoryCountries > 0
      ? `${input.severeAdvisoryCountries} destination(s) at advisory level 3+`
      : input.totalCountries > 0 ? "No severe advisories" : undefined,
  });
  const missingEmergency = input.totalCountries - input.countriesWithEmergencyInfo;
  checks.push({
    key: "emergency",
    phase: "before",
    label: "Emergency contacts on hand",
    status: input.totalCountries === 0 ? "na" : missingEmergency <= 0 ? "done" : "pending",
    detail: input.totalCountries === 0
      ? undefined
      : missingEmergency <= 0 ? "Local numbers available for every destination" : `Missing for ${missingEmergency} destination(s)`,
  });

  // ── During / after — lifecycle guidance (not scored) ───────────────────────
  checks.push({ key: "checkins", phase: "during", label: "Check in on schedule", status: "pending", detail: "Agree a comms cadence and a missed-check-in plan" });
  checks.push({ key: "monitor", phase: "during", label: "Monitor advisory changes", status: "pending", detail: "Re-pull advisories for active destinations" });
  checks.push({ key: "offline-emergency", phase: "during", label: "Emergency card saved offline", status: "pending", detail: "Print or screenshot from /tools/emergency" });
  checks.push({ key: "debrief", phase: "after", label: "Debrief & log incidents", status: "pending", detail: "Record anything that went wrong while it's fresh" });
  checks.push({ key: "record", phase: "after", label: "Update travel record", status: "pending", detail: "Archive the trip to your logbook" });

  const before = checks.filter((c) => c.phase === "before");
  const done = before.filter((c) => c.status === "done").length;
  const pending = before.filter((c) => c.status === "pending").length;
  const applicable = done + pending;
  const score = applicable === 0 ? null : Math.round((done / applicable) * 100);

  return { checks, score, done, pending, applicable, currentPhase: phaseFor(input.today, input.startDay, input.endDay) };
}
