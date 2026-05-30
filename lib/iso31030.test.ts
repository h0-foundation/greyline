import { describe, it, expect } from "vitest";
import { computeItineraryReadiness, type ReadinessInput } from "./iso31030";

const base: ReadinessInput = {
  today: 100,
  startDay: 200,
  endDay: 210,
  destinationsWithCountry: 2,
  hasThreatModel: true,
  documents: { total: 5, checked: 5 },
  packing: { total: 8, checked: 8 },
  visaRequiredCountries: 0,
  severeAdvisoryCountries: 0,
  countriesWithEmergencyInfo: 2,
  totalCountries: 2,
};

describe("computeItineraryReadiness", () => {
  it("scores 100 when every actionable 'before' check is done", () => {
    const r = computeItineraryReadiness(base);
    expect(r.score).toBe(100);
    expect(r.pending).toBe(0);
    expect(r.currentPhase).toBe("before"); // today 100 < start 200
  });

  it("excludes non-applicable checks from the score", () => {
    // visas not required + no advisories + no emergency gaps -> those are done/na,
    // not counted against readiness.
    const r = computeItineraryReadiness(base);
    const visas = r.checks.find((c) => c.key === "visas")!;
    expect(visas.status).toBe("na");
    expect(r.applicable).toBe(r.done + r.pending);
  });

  it("drops to pending checks on an empty trip", () => {
    const r = computeItineraryReadiness({
      today: null,
      startDay: null,
      endDay: null,
      destinationsWithCountry: 0,
      hasThreatModel: false,
      documents: null,
      packing: null,
      visaRequiredCountries: 0,
      severeAdvisoryCountries: 0,
      countriesWithEmergencyInfo: 0,
      totalCountries: 0,
    });
    expect(r.score).toBe(0);
    expect(r.done).toBe(0);
    // itinerary + dates + threat are pending; documents/packing/visas/advisories/emergency are na
    expect(r.pending).toBe(3);
    expect(r.currentPhase).toBe("before");
  });

  it("surfaces partial checklist progress as pending with an x/total detail", () => {
    const r = computeItineraryReadiness({ ...base, documents: { total: 5, checked: 3 } });
    const docs = r.checks.find((c) => c.key === "documents")!;
    expect(docs.status).toBe("pending");
    expect(docs.detail).toBe("3 / 5");
  });

  it("flags outstanding visas and severe advisories", () => {
    const r = computeItineraryReadiness({ ...base, visaRequiredCountries: 1, severeAdvisoryCountries: 2 });
    expect(r.checks.find((c) => c.key === "visas")!.status).toBe("pending");
    expect(r.checks.find((c) => c.key === "advisories")!.status).toBe("pending");
  });

  it("tracks the current lifecycle phase against the trip dates", () => {
    expect(computeItineraryReadiness({ ...base, today: 205 }).currentPhase).toBe("during");
    expect(computeItineraryReadiness({ ...base, today: 999 }).currentPhase).toBe("after");
  });
});
