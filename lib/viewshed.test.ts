import { describe, it, expect } from "vitest";
import {
  toLocalMeters,
  distanceMeters,
  segmentsIntersect,
  computeExposure,
  type Observer,
  type Footprint,
} from "./viewshed";

describe("toLocalMeters / distanceMeters", () => {
  it("origin maps to (0,0)", () => {
    expect(toLocalMeters({ lon: 13.4, lat: 52.5 }, { lon: 13.4, lat: 52.5 })).toEqual({ x: 0, y: 0 });
  });
  it("1° latitude north ≈ 111 km", () => {
    const d = distanceMeters({ lon: 0, lat: 0 }, { lon: 0, lat: 1 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
  it("east offset scales by cos(latitude)", () => {
    const here = { lon: 0, lat: 60 };
    const east = toLocalMeters({ lon: 0.001, lat: 60 }, here);
    // at 60°, cos = 0.5 → east metres are about half the equator value
    const equator = toLocalMeters({ lon: 0.001, lat: 0 }, { lon: 0, lat: 0 });
    expect(east.x).toBeLessThan(equator.x);
    expect(east.x / equator.x).toBeCloseTo(0.5, 1);
  });
});

describe("segmentsIntersect", () => {
  it("detects a clean crossing", () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 2, y: 0 })).toBe(true);
  });
  it("returns false for non-crossing segments", () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBe(false);
  });
});

describe("computeExposure", () => {
  const target = { lon: 13.4000, lat: 52.5000 };
  // ~22 m east, ~22 m north of target (small offsets).
  const near: Observer = { id: "near", lon: 13.40030, lat: 52.50018 };
  // ~330 m north — out of default 60 m range.
  const far: Observer = { id: "far", lon: 13.4000, lat: 52.5030 };

  it("an in-range observer with clear sight is exposed", () => {
    const r = computeExposure(target, [near]);
    expect(r.sightlines[0].visible).toBe(true);
    expect(r.exposedTo).toBe(1);
    expect(r.band).toBe("high"); // 1/1
  });

  it("an out-of-range observer is not exposed (blockedBy range)", () => {
    const r = computeExposure(target, [far]);
    expect(r.sightlines[0].visible).toBe(false);
    expect(r.sightlines[0].blockedBy).toBe("range");
    expect(r.band).toBe("clear");
  });

  it("a building between observer and target blocks the line (blockedBy obstruction)", () => {
    // The sight line runs from `near` (≈ +20 m E, +20 m N) down to the target at
    // the origin — a SW-pointing diagonal. A blocking wall must cross it: place a
    // segment from NW to SE through the midpoint (≈ +10 m E, +10 m N), i.e. one
    // end up-and-left of the line, the other down-and-right of it.
    const wall: Footprint = [
      { lon: 13.39995, lat: 52.50012 }, // NW of the midpoint (left of the line)
      { lon: 13.40020, lat: 52.50004 }, // SE of the midpoint (right of the line)
    ];
    const r = computeExposure(target, [near], [wall]);
    expect(r.sightlines[0].visible).toBe(false);
    expect(r.sightlines[0].blockedBy).toBe("obstruction");
    expect(r.band).toBe("clear");
  });

  it("ratio + band reflect the fraction of observers with sight", () => {
    const o2: Observer = { id: "near2", lon: 13.39975, lat: 52.49985 }; // in range, clear
    const r = computeExposure(target, [near, o2, far]);
    expect(r.total).toBe(3);
    expect(r.exposedTo).toBe(2); // near + o2 visible, far out of range
    expect(r.exposureRatio).toBeCloseTo(2 / 3, 5);
    expect(r.band).toBe("high"); // >= 0.66
  });

  it("no observers → clear, ratio 0", () => {
    const r = computeExposure(target, []);
    expect(r).toMatchObject({ total: 0, exposedTo: 0, exposureRatio: 0, band: "clear" });
  });

  it("honours a per-observer range override", () => {
    const tight: Observer = { ...near, id: "tight", rangeM: 5 };
    const r = computeExposure(target, [tight]);
    expect(r.sightlines[0].blockedBy).toBe("range");
  });

  it("distance is reported even when blocked", () => {
    const r = computeExposure(target, [far]);
    expect(r.sightlines[0].distanceM).toBeGreaterThan(300);
  });
});
