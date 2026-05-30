/* Road-safety reframe — pure, offline, bundled data.
 *
 * Road traffic crashes are the leading cause of injury death among travellers —
 * far ahead of terrorism or political violence (CDC Yellow Book, "Injury &
 * Trauma"; WHO Global Status Report on Road Safety). Greyline's risk view led
 * with advisories and indices that under-weight the thing most likely to
 * actually kill a traveller. This surfaces the per-country road death rate so
 * the dominant, addressable risk is visible and actionable.
 *
 * Figures: WHO Global Status Report on Road Safety 2018 — estimated road
 * traffic deaths per 100,000 population (2016). Modelled estimates; a curated
 * subset of high-traffic destinations where the figure is well established.
 */

export interface RoadSafety {
  ratePer100k: number;
  /** Data year for the estimate. */
  year: number;
}

// WHO global average for context (2016 estimate, per 100,000).
export const WHO_GLOBAL_AVG = 18.2;
export const ROAD_SAFETY_SOURCE = "WHO Global Status Report on Road Safety 2018 (deaths per 100,000, 2016 estimate)";

const RATES: Record<string, number> = {
  // Europe
  GB: 3.1, DE: 4.1, FR: 5.5, ES: 4.1, IT: 5.6, NL: 3.8, BE: 6.1, CH: 2.7,
  AT: 5.2, SE: 2.8, NO: 2.7, DK: 4.0, FI: 4.7, IE: 4.1, PT: 6.0, GR: 6.6,
  PL: 9.7, CZ: 6.1, RU: 18.0, UA: 13.7, TR: 12.3,
  // Americas
  US: 12.4, CA: 5.8, MX: 13.1, BR: 19.7, AR: 14.0, CL: 12.4, CO: 18.5, PE: 13.5,
  // Asia & Pacific
  JP: 4.1, KR: 9.8, CN: 18.2, IN: 22.6, TH: 32.7, VN: 26.4, ID: 12.2, MY: 23.6,
  PH: 12.3, SG: 2.8, AU: 5.6, NZ: 7.8, PK: 14.3,
  // Middle East & Africa
  ZA: 25.9, KE: 27.8, NG: 21.4, MA: 19.7, AE: 18.1, SA: 28.8, IL: 4.2, IR: 20.5, QA: 9.0,
};

export function getRoadSafety(code: string): RoadSafety | null {
  const rate = RATES[code.toUpperCase()];
  return rate == null ? null : { ratePer100k: rate, year: 2016 };
}

export type RoadBand = "low" | "below" | "average" | "high" | "very-high";

export interface RoadBandInfo {
  band: RoadBand;
  label: string;
  /** Comparison to the WHO global average, e.g. "2.1× the global average". */
  vsGlobal: string;
}

export function roadBand(rate: number): RoadBandInfo {
  const ratio = rate / WHO_GLOBAL_AVG;
  const vsGlobal =
    ratio >= 1.05 ? `${ratio.toFixed(1)}× the global average`
    : ratio <= 0.95 ? `${Math.round((1 - ratio) * 100)}% below the global average`
    : "about the global average";
  // Bands are relative to the global average so the label and the comparison
  // never contradict (e.g. "below average" with "32% below the average").
  let band: RoadBand;
  let label: string;
  if (ratio < 0.4) { band = "low"; label = "Low"; }
  else if (ratio < 0.8) { band = "below"; label = "Below average"; }
  else if (ratio < 1.25) { band = "average"; label = "Around the global average"; }
  else if (ratio < 1.75) { band = "high"; label = "High"; }
  else { band = "very-high"; label = "Very high"; }
  return { band, label, vsGlobal };
}

// The calibrated message — what the evidence actually says, no fear-mongering.
export const ROAD_SAFETY_FACTS = [
  "Road crashes are the leading cause of injury death for travellers — well above terrorism or unrest (CDC Yellow Book).",
  "Most are preventable: avoid night driving, always belt up (front and back), skip motorbikes/scooters or never ride without a helmet, and prefer reputable operators over informal transport.",
];
