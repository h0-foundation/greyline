/* Greyline Risk Score — an OPEN, auditable composite country-risk rating.
 *
 * The professional travel-risk products (GeoSure GeoSafeScores, Riskline, ISOS)
 * sell a single 0-100 number computed by a proprietary black box. Greyline's
 * differentiator is that the methodology is fully inspectable: every sub-score
 * shows its source value, its normalization, and its weight, and the composite
 * is just their weighted mean over whatever inputs are available. Higher = riskier.
 *
 * All inputs come from data already bundled in `country_indices` (+ the peak
 * government advisory). No network, computed on demand. See
 * research/TRAVEL_RISK_LANDSCAPE.md for the rationale. */

import type { CountryIndices } from "@/server/db/repositories/dossier";

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const round = (n: number) => Math.round(n);

export type RiskBand = "Low" | "Moderate" | "Elevated" | "High" | "Extreme";

export type SubScore = {
  key: string;
  label: string;
  /** the raw source value + a human label, e.g. "GPI 1.43" */
  source: string;
  /** 0-100 normalized risk contribution (higher = riskier) */
  risk: number;
  /** relative weight within the composite */
  weight: number;
};

export type RiskScore = {
  /** 0-100 composite (higher = riskier); null when no inputs are available */
  score: number | null;
  band: RiskBand | null;
  subScores: SubScore[];
  /** dimension labels with no bundled data (so the UI can be honest about gaps) */
  missing: string[];
  /** how much of the intended weight was actually available (0-1) */
  coverage: number;
};

export function riskBand(score: number): RiskBand {
  if (score < 20) return "Low";
  if (score < 40) return "Moderate";
  if (score < 60) return "Elevated";
  if (score < 80) return "High";
  return "Extreme";
}

/* Dimension definitions: each maps a bundled indicator to a 0-100 risk and a
 * weight. Directions are documented inline; `normalize` returns null when the
 * source value is absent so the composite re-weights over what exists. */
type Dimension = {
  key: string;
  label: string;
  weight: number;
  normalize: (i: CountryIndices, peakAdvisory: number | null) => { risk: number; source: string } | null;
};

const DIMENSIONS: Dimension[] = [
  {
    key: "conflict",
    label: "Conflict & violence",
    weight: 0.3,
    // Global Peace Index ~1.0 (most peaceful) .. ~3.8 (least). Lower = safer.
    normalize: (i) =>
      i.gpi_score == null ? null : { risk: clamp(((i.gpi_score - 1) / (3.5 - 1)) * 100), source: `GPI ${i.gpi_score.toFixed(2)}` },
  },
  {
    key: "advisory",
    label: "Government advisory",
    weight: 0.25,
    // Peak multi-government advisory level 1 (normal) .. 4 (do not travel).
    normalize: (_i, peak) =>
      peak == null ? null : { risk: clamp(((peak - 1) / 3) * 100), source: `Level ${peak}/4` },
  },
  {
    key: "fragility",
    label: "State fragility",
    weight: 0.2,
    // Fragile States Index total 0 .. 120 (higher = more fragile).
    normalize: (i) =>
      i.fsi_score == null ? null : { risk: clamp((i.fsi_score / 120) * 100), source: `FSI ${i.fsi_score.toFixed(0)}` },
  },
  {
    key: "governance",
    label: "Corruption / governance",
    weight: 0.15,
    // Transparency Intl CPI 0 (highly corrupt) .. 100 (clean). Risk = 100 - CPI.
    normalize: (i) =>
      i.cpi_score == null ? null : { risk: clamp(100 - i.cpi_score), source: `CPI ${i.cpi_score}` },
  },
  {
    key: "press",
    label: "Press freedom",
    weight: 0.1,
    // RSF press-freedom score 0 (worst) .. 100 (best). Risk = 100 - score.
    normalize: (i) =>
      i.rsf_score == null ? null : { risk: clamp(100 - i.rsf_score), source: `RSF ${i.rsf_score.toFixed(0)}` },
  },
];

/** Compute the composite Greyline Risk Score for a country. */
export function computeRiskScore(
  indices: CountryIndices | null | undefined,
  peakAdvisory: number | null = null,
): RiskScore {
  const subScores: SubScore[] = [];
  const missing: string[] = [];
  // Empty-indices fallback lets advisory (which reads peakAdvisory, not indices)
  // still score when no dossier row exists; index-based dims simply go missing.
  const idx = indices ?? ({} as CountryIndices);

  for (const d of DIMENSIONS) {
    const n = d.normalize(idx, peakAdvisory);
    if (n) {
      subScores.push({ key: d.key, label: d.label, source: n.source, risk: round(n.risk), weight: d.weight });
    } else {
      missing.push(d.label);
    }
  }

  if (subScores.length === 0) {
    return { score: null, band: null, subScores: [], missing, coverage: 0 };
  }

  const totalWeight = subScores.reduce((s, x) => s + x.weight, 0);
  const composite = subScores.reduce((s, x) => s + x.risk * x.weight, 0) / totalWeight;
  const intendedWeight = DIMENSIONS.reduce((s, d) => s + d.weight, 0);

  const score = round(composite);
  return { score, band: riskBand(score), subScores, missing, coverage: totalWeight / intendedWeight };
}
