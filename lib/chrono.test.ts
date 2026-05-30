import { describe, it, expect } from "vitest";
import { sunPosition, cardinal, shadow, altitudeFromShadowRatio } from "./chrono";

describe("cardinal", () => {
  it("maps bearings to 16-point compass labels", () => {
    expect(cardinal(0)).toBe("N");
    expect(cardinal(90)).toBe("E");
    expect(cardinal(180)).toBe("S");
    expect(cardinal(270)).toBe("W");
    expect(cardinal(45)).toBe("NE");
    expect(cardinal(360)).toBe("N");
    expect(cardinal(-22.5)).toBe("NNW");
  });
  it("returns empty string for non-finite input", () => {
    expect(cardinal(NaN)).toBe("");
  });
});

describe("shadow", () => {
  it("points opposite the sun and is one object-height long at 45°", () => {
    const s = shadow(45, 90);
    expect(s.direction).toBe(270);
    expect(s.lengthRatio).toBeCloseTo(1, 6);
  });
  it("is infinite at/near the horizon", () => {
    expect(shadow(0.1, 180).lengthRatio).toBe(Infinity);
  });
  it("lengthens at low sun (cot 30° ≈ 1.732)", () => {
    expect(shadow(30, 180).lengthRatio).toBeCloseTo(1.732, 3);
  });
});

describe("altitudeFromShadowRatio", () => {
  it("inverts the shadow-length relation", () => {
    expect(altitudeFromShadowRatio(1)).toBeCloseTo(45, 6);
    expect(altitudeFromShadowRatio(Math.sqrt(3))).toBeCloseTo(30, 6);
    expect(altitudeFromShadowRatio(0)).toBe(90); // overhead guard
  });
});

describe("sunPosition", () => {
  it("puts the solstice sun declination near the obliquity (~23.4°)", () => {
    const p = sunPosition(new Date("2024-06-21T12:00:00Z"), 0, 0);
    expect(p.declination).toBeCloseTo(23.4, 0);
  });
  it("at the North Pole on the solstice, altitude ≈ declination", () => {
    const p = sunPosition(new Date("2024-06-21T12:00:00Z"), 90, 0);
    expect(p.altitude).toBeCloseTo(23.4, 0);
  });
  it("keeps azimuth in [0,360) and altitude in [-90,90]", () => {
    const p = sunPosition(new Date("2024-03-20T09:30:00Z"), 48.85, 2.35);
    expect(p.azimuth).toBeGreaterThanOrEqual(0);
    expect(p.azimuth).toBeLessThan(360);
    expect(p.altitude).toBeGreaterThanOrEqual(-90);
    expect(p.altitude).toBeLessThanOrEqual(90);
  });
});
