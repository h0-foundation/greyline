import { describe, it, expect } from "vitest";
import {
  isSchengen,
  epochDay,
  fromEpochDay,
  addMonths,
  schengenStatus,
  passportValidity,
} from "./visa";

describe("isSchengen", () => {
  it("knows members and non-members", () => {
    expect(isSchengen("FR")).toBe(true);
    expect(isSchengen("fr")).toBe(true);
    expect(isSchengen("HR")).toBe(true); // Croatia 2023
    expect(isSchengen("RO")).toBe(true); // Romania 2025
    expect(isSchengen("GB")).toBe(false);
    expect(isSchengen("IE")).toBe(false); // not in Schengen
    expect(isSchengen("CY")).toBe(false);
    expect(isSchengen(null)).toBe(false);
  });
});

describe("epochDay / fromEpochDay", () => {
  it("anchors the Unix epoch", () => {
    expect(epochDay("1970-01-01")).toBe(0);
    expect(epochDay("1970-01-02")).toBe(1);
  });
  it("rejects malformed and impossible dates", () => {
    expect(epochDay("2023-02-29")).toBeNull(); // 2023 not a leap year
    expect(epochDay("2024-13-01")).toBeNull();
    expect(epochDay("2024-00-10")).toBeNull();
    expect(epochDay("not-a-date")).toBeNull();
  });
  it("accepts a real leap day and round-trips", () => {
    expect(epochDay("2024-02-29")).not.toBeNull();
    expect(fromEpochDay(epochDay("2024-06-15")!)).toBe("2024-06-15");
  });
});

describe("addMonths", () => {
  it("clamps to the last valid day of a shorter month", () => {
    expect(fromEpochDay(addMonths(epochDay("2024-01-31")!, 1))).toBe("2024-02-29"); // leap
    expect(fromEpochDay(addMonths(epochDay("2023-01-31")!, 1))).toBe("2023-02-28");
  });
});

describe("schengenStatus (90/180)", () => {
  const D = epochDay("2024-06-01")!;

  it("is compliant with no stays", () => {
    const s = schengenStatus([], D);
    expect(s.used).toBe(0);
    expect(s.remaining).toBe(90);
    expect(s.compliant).toBe(true);
    expect(s.earliestReentry).toBeNull();
  });

  it("counts a 90-day stay as exactly compliant", () => {
    const s = schengenStatus([{ entry: D - 89, exit: D }], D);
    expect(s.used).toBe(90);
    expect(s.compliant).toBe(true);
  });

  it("flags a 100-day stay as over and computes earliest re-entry", () => {
    const s = schengenStatus([{ entry: D - 99, exit: D }], D);
    expect(s.used).toBe(100);
    expect(s.remaining).toBe(-10);
    expect(s.compliant).toBe(false);
    // First day the rolling window's presence drops to <=89.
    expect(s.earliestReentry).toBe(D + 91);
  });
});

describe("passportValidity", () => {
  const entry = epochDay("2024-06-01")!;
  it("applies the 6-month rule for non-Schengen", () => {
    const v = passportValidity({ expiry: epochDay("2025-01-01")!, entry, destIso2: "US" });
    expect(v.ruleMonths).toBe(6);
    expect(v.requiredUntil).toBe(epochDay("2024-12-01"));
    expect(v.ok).toBe(true);
  });
  it("fails when the passport expires before the required date", () => {
    const v = passportValidity({ expiry: epochDay("2024-11-01")!, entry, destIso2: "US" });
    expect(v.ok).toBe(false);
  });
  it("applies the 3-month rule for Schengen", () => {
    const v = passportValidity({ expiry: epochDay("2025-01-01")!, entry, destIso2: "FR" });
    expect(v.ruleMonths).toBe(3);
    expect(v.requiredUntil).toBe(epochDay("2024-09-01"));
  });
});
