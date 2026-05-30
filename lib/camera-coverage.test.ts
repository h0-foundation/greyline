import { describe, it, expect } from "vitest";
import { parseBearing, classifyCamera, coneRing, cameraCones, cameraCounts, type RawCamera } from "./camera-coverage";

describe("parseBearing", () => {
  it("reads compass points (case-insensitive)", () => {
    expect(parseBearing("N")).toBe(0);
    expect(parseBearing("ne")).toBe(45);
    expect(parseBearing("W")).toBe(270);
  });
  it("normalises numeric degrees into [0,360)", () => {
    expect(parseBearing("90")).toBe(90);
    expect(parseBearing("450")).toBe(90);
    expect(parseBearing("-10")).toBe(350);
  });
  it("returns null for empty / unparseable", () => {
    expect(parseBearing(undefined)).toBeNull();
    expect(parseBearing("banana")).toBeNull();
  });
});

describe("classifyCamera", () => {
  it("flags ALPR/ANPR plate-readers", () => {
    expect(classifyCamera({ "surveillance:type": "ALPR" })).toBe("alpr");
    expect(classifyCamera({ "surveillance:type": "anpr" })).toBe("alpr");
  });
  it("flags dome/panning as dome, else fixed", () => {
    expect(classifyCamera({ "camera:type": "dome" })).toBe("dome");
    expect(classifyCamera({ "camera:type": "panning" })).toBe("dome");
    expect(classifyCamera({})).toBe("fixed");
  });
});

describe("coneRing", () => {
  it("returns a closed full circle for a dome (steps*2 + closing point)", () => {
    const ring = coneRing(0, 0, "dome", null);
    expect(ring).toHaveLength(18 * 2 + 1);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });
  it("returns [] for a directionless fixed/ALPR camera", () => {
    expect(coneRing(0, 0, "fixed", null)).toEqual([]);
    expect(coneRing(0, 0, "alpr", null)).toEqual([]);
  });
  it("returns an apex-anchored wedge for a directional camera", () => {
    const ring = coneRing(0, 0, "fixed", 90);
    expect(ring.length).toBe(1 + (18 + 1) + 1);
    expect(ring[0]).toEqual([0, 0]);
    expect(ring[ring.length - 1]).toEqual([0, 0]);
  });
});

describe("cameraCones / cameraCounts", () => {
  const cams: RawCamera[] = [
    { lat: 0, lon: 0, tags: { "camera:type": "dome" } }, // dome -> cone
    { lat: 0, lon: 0, tags: { "surveillance:type": "ALPR" } }, // ALPR, no dir -> no cone
    { lat: 0, lon: 0, tags: { "camera:direction": "90" } }, // fixed + dir -> cone
    { tags: { "camera:type": "dome" } }, // missing coords -> skipped
  ];
  it("emits cones only for dome + directional cameras", () => {
    const fc = cameraCones(cams);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toHaveLength(2);
  });
  it("counts totals and ALPR split (coordinateless dropped)", () => {
    expect(cameraCounts(cams)).toEqual({ total: 3, alpr: 1, cctv: 2 });
  });
});
