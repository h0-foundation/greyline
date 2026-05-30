import { describe, it, expect } from "vitest";
import { getRoadSafety, roadBand, WHO_GLOBAL_AVG } from "./road-safety";

describe("getRoadSafety", () => {
  it("looks up bundled rates case-insensitively", () => {
    expect(getRoadSafety("US")).toEqual({ ratePer100k: 12.4, year: 2016 });
    expect(getRoadSafety("us")).toEqual({ ratePer100k: 12.4, year: 2016 });
  });
  it("returns null for unknown countries", () => {
    expect(getRoadSafety("ZZ")).toBeNull();
  });
});

describe("roadBand", () => {
  it("calls the global average 'around the global average'", () => {
    const b = roadBand(WHO_GLOBAL_AVG);
    expect(b.band).toBe("average");
    expect(b.vsGlobal).toMatch(/about the global average/);
  });
  it("bands a very-safe country as low and below-average phrasing agrees", () => {
    const b = roadBand(2.7); // Switzerland
    expect(b.band).toBe("low");
    expect(b.vsGlobal).toMatch(/below the global average/);
  });
  it("bands a high-fatality country as very-high with a multiple", () => {
    const b = roadBand(32.7); // Thailand
    expect(b.band).toBe("very-high");
    expect(b.vsGlobal).toMatch(/× the global average/);
  });
  it("never contradicts label and comparison around the boundary", () => {
    const b = roadBand(12.4); // 0.68× -> below
    expect(b.band).toBe("below");
    expect(b.vsGlobal).toMatch(/below the global average/);
  });
});
