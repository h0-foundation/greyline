import { describe, it, expect } from "vitest";
import { riskBand, computeRiskScore } from "./risk-score";

// Build a partial indices object without importing the SQLite-bound type.
type Idx = Parameters<typeof computeRiskScore>[0];
const idx = (o: Record<string, number>) => o as unknown as Idx;

describe("riskBand", () => {
  it("brackets 0-100 into the five bands", () => {
    expect(riskBand(10)).toBe("Low");
    expect(riskBand(20)).toBe("Moderate");
    expect(riskBand(30)).toBe("Moderate");
    expect(riskBand(50)).toBe("Elevated");
    expect(riskBand(70)).toBe("High");
    expect(riskBand(80)).toBe("Extreme");
    expect(riskBand(95)).toBe("Extreme");
  });
});

describe("computeRiskScore", () => {
  it("returns a null score with full coverage gap when nothing is available", () => {
    const r = computeRiskScore(null, null);
    expect(r.score).toBeNull();
    expect(r.band).toBeNull();
    expect(r.coverage).toBe(0);
    expect(r.missing).toHaveLength(5);
  });

  it("scores from the advisory alone when no indices exist", () => {
    const r = computeRiskScore(null, 4); // worst advisory level
    expect(r.score).toBe(100);
    expect(r.band).toBe("Extreme");
    expect(r.coverage).toBeCloseTo(0.25, 5); // advisory weight / total
    expect(r.missing).toHaveLength(4);
  });

  it("scores 0 / Low with full coverage when every dimension is safest", () => {
    const r = computeRiskScore(idx({ gpi_score: 1, fsi_score: 0, cpi_score: 100, rsf_score: 100 }), 1);
    expect(r.score).toBe(0);
    expect(r.band).toBe("Low");
    expect(r.coverage).toBeCloseTo(1, 5);
    expect(r.missing).toHaveLength(0);
  });

  it("coerces a NaN index to lowest risk rather than Extreme (clamp guard)", () => {
    const r = computeRiskScore(idx({ gpi_score: NaN, fsi_score: 0, cpi_score: 100, rsf_score: 100 }), 1);
    expect(r.score).toBe(0);
    expect(r.band).not.toBe("Extreme");
  });
});
