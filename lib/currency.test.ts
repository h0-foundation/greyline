import { describe, it, expect } from "vitest";
import { channelCosts, perDiem, denominations, exceedsDeclarationThreshold } from "./currency";

describe("channelCosts", () => {
  it("applies each channel's spread against the mid-rate", () => {
    const costs = channelCosts(2.0);
    expect(costs).toHaveLength(4);
    const kiosk = costs.find((c) => c.name.includes("kiosk"))!;
    expect(kiosk.effectiveRate).toBeCloseTo(1.76, 6); // 2 * (1 - 0.12)
    expect(kiosk.lossPer100).toBeCloseTo(12, 6);
    const card = costs.find((c) => c.name.includes("Card"))!;
    expect(card.lossPer100).toBeCloseTo(1, 6);
  });
});

describe("perDiem", () => {
  it("sums the daily tiers and multiplies by whole days", () => {
    const r = perDiem(3, "budget");
    expect(r.daily.total).toBe(120);
    expect(r.total).toBe(360);
  });
  it("floors fractional days and floors non-positive to zero", () => {
    expect(perDiem(2.7, "budget").total).toBe(240);
    expect(perDiem(0, "standard").total).toBe(0);
    expect(perDiem(-5, "comfort").total).toBe(0);
  });
});

describe("denominations", () => {
  it("greedily decomposes into the largest notes first", () => {
    expect(denominations(287, "USD", [100, 50, 20, 10, 5, 1])).toEqual([
      { note: 100, count: 2 },
      { note: 50, count: 1 },
      { note: 20, count: 1 },
      { note: 10, count: 1 },
      { note: 5, count: 1 },
      { note: 1, count: 2 },
    ]);
  });
  it("returns [] for non-positive amounts or no notes", () => {
    expect(denominations(0, "USD", [100])).toEqual([]);
    expect(denominations(50, "USD", [])).toEqual([]);
  });
});

describe("exceedsDeclarationThreshold", () => {
  it("converts the ~10k home threshold into destination terms", () => {
    expect(exceedsDeclarationThreshold(10_000, 1)).toBe(true);
    expect(exceedsDeclarationThreshold(9_999, 1)).toBe(false);
    expect(exceedsDeclarationThreshold(20_000, 2)).toBe(true);
    expect(exceedsDeclarationThreshold(19_999, 2)).toBe(false);
  });
  it("is false for an invalid rate", () => {
    expect(exceedsDeclarationThreshold(50_000, 0)).toBe(false);
  });
});
