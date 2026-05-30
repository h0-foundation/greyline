import { describe, it, expect } from "vitest";
import { haversineMeters, routeMetrics, deviationLabel, formatDistance } from "./route-planning";

describe("haversineMeters", () => {
  it("is 0 for the same point", () => {
    expect(haversineMeters({ lng: 10, lat: 50 }, { lng: 10, lat: 50 })).toBe(0);
  });
  it("is ~111.2 km for one degree of latitude", () => {
    const d = haversineMeters({ lng: 0, lat: 0 }, { lng: 0, lat: 1 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });
});

describe("routeMetrics", () => {
  it("returns zeros for fewer than two valid points", () => {
    expect(routeMetrics([{ lng: 0, lat: 0 }])).toMatchObject({ legs: 0, totalM: 0, deviationRatio: 0 });
    expect(routeMetrics([])).toMatchObject({ points: 0 });
  });
  it("collinear meridian path has deviationRatio 1", () => {
    const m = routeMetrics([{ lng: 0, lat: 0 }, { lng: 0, lat: 1 }, { lng: 0, lat: 2 }]);
    expect(m.points).toBe(3);
    expect(m.legs).toBe(2);
    expect(m.deviationRatio).toBeCloseTo(1, 6);
  });
  it("drops non-finite points before measuring", () => {
    const m = routeMetrics([{ lng: 0, lat: 0 }, { lng: NaN, lat: 1 }, { lng: 0, lat: 2 }]);
    expect(m.points).toBe(2);
  });
});

describe("deviationLabel", () => {
  it("maps ratios to qualitative reads", () => {
    expect(deviationLabel(0)).toBe("—");
    expect(deviationLabel(1.1)).toMatch(/Direct/);
    expect(deviationLabel(1.5)).toMatch(/Moderate/);
    expect(deviationLabel(2)).toMatch(/good SDR/);
    expect(deviationLabel(3.5)).toMatch(/Very indirect/);
  });
});

describe("formatDistance", () => {
  it("formats metres and kilometres", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(-5)).toBe("0 m");
    expect(formatDistance(500)).toBe("500 m");
    expect(formatDistance(1500)).toBe("1.50 km");
    expect(formatDistance(15000)).toBe("15.0 km");
  });
});
