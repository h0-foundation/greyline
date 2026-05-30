import { describe, it, expect } from "vitest";
import {
  haversineKm,
  priorityFor,
  severityFromMagnitude,
  severityFromGdacsLevel,
  normalizeUsgs,
  normalizeGdacs,
  rationalize,
  type Alert,
} from "./alarm-rationalization";

describe("haversineKm", () => {
  it("is ~111 km per degree of latitude", () => {
    const d = haversineKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });
});

describe("severity mappings", () => {
  it("maps USGS magnitude to 0..4 bands", () => {
    expect(severityFromMagnitude(7.2)).toBe(4);
    expect(severityFromMagnitude(6.1)).toBe(3);
    expect(severityFromMagnitude(5.0)).toBe(2);
    expect(severityFromMagnitude(4.2)).toBe(1);
    expect(severityFromMagnitude(3.0)).toBe(0);
  });
  it("maps GDACS alert levels to severity", () => {
    expect(severityFromGdacsLevel("Red")).toBe(4);
    expect(severityFromGdacsLevel("Orange")).toBe(2);
    expect(severityFromGdacsLevel("Green")).toBe(1);
    expect(severityFromGdacsLevel("")).toBe(0);
  });
});

describe("priorityFor", () => {
  it("escalates a nearby hazard by one band", () => {
    expect(priorityFor(2, 50)).toBe(3);
  });
  it("de-escalates a very distant hazard", () => {
    expect(priorityFor(2, 2000)).toBe(1);
  });
  it("clamps to 0..4", () => {
    expect(priorityFor(4, 10)).toBe(4); // already max, no overflow
    expect(priorityFor(0, 5000)).toBe(0);
  });
  it("leaves mid-distance hazards unchanged", () => {
    expect(priorityFor(2, 500)).toBe(2);
  });
});

describe("normalizeUsgs / normalizeGdacs", () => {
  it("maps USGS features (coords are [lon,lat,depth])", () => {
    const alerts = normalizeUsgs([
      { id: "us1", properties: { mag: 6.4, place: "Off the coast", time: 1000 }, geometry: { coordinates: [13.4, 52.5, 10] } },
      { id: "bad", properties: { mag: 5 }, geometry: { coordinates: [] } }, // dropped (no coords)
    ]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ id: "us1", kind: "earthquake", severity: 3, lat: 52.5, lon: 13.4, time: 1000 });
  });
  it("maps GDACS features incl. event-type → kind", () => {
    const alerts = normalizeGdacs([
      { properties: { eventid: "g1", eventtype: "TC", alertlevel: "Red", name: "Cyclone X", fromdate: "2026-05-01T00:00:00Z" }, geometry: { coordinates: [120, -15] } },
    ]);
    expect(alerts[0]).toMatchObject({ id: "g1", kind: "cyclone", severity: 4, lat: -15, lon: 120 });
    expect(alerts[0].time).toBeGreaterThan(0);
  });
  it("unknown GDACS event type falls back to 'other'", () => {
    const a = normalizeGdacs([{ properties: { eventid: "g2", eventtype: "ZZ", alertlevel: "Green" }, geometry: { coordinates: [0, 0] } }]);
    expect(a[0].kind).toBe("other");
  });
});

describe("rationalize", () => {
  const base = (over: Partial<Alert>): Alert => ({
    id: Math.random().toString(36).slice(2),
    kind: "earthquake",
    severity: 2,
    title: "quake",
    lat: 0,
    lon: 0,
    time: 1_000_000,
    ...over,
  });

  it("filters below minSeverity", () => {
    const r = rationalize([base({ severity: 0 }), base({ severity: 3 })], { minSeverity: 1 });
    expect(r.totalIn).toBe(2);
    expect(r.filtered).toBe(1);
    expect(r.alerts).toHaveLength(1);
  });

  it("filters by radius when an origin is given", () => {
    const origin = { lat: 0, lon: 0 };
    const near = base({ lat: 0.1, lon: 0.1, id: "near" }); // ~15 km
    const far = base({ lat: 10, lon: 10, id: "far" }); // ~1500 km
    const r = rationalize([near, far], { origin, radiusKm: 100 });
    expect(r.filtered).toBe(1);
    expect(r.alerts.map((a) => a.id)).toEqual(["near"]);
    expect(r.alerts[0].distanceKm).toBeGreaterThan(0);
  });

  it("de-duplicates same-kind alerts close in space and time", () => {
    const a = base({ id: "a", severity: 3, lat: 0, lon: 0, time: 1_000_000 });
    const dup = base({ id: "b", severity: 2, lat: 0.05, lon: 0.05, time: 1_000_000 + 60_000 }); // ~7 km, +1 min
    const r = rationalize([a, dup], { dedupeKm: 50 });
    expect(r.deduped).toBe(1);
    expect(r.alerts).toHaveLength(1);
    expect(r.alerts[0].id).toBe("a"); // higher severity kept
    expect(r.alerts[0].mergedCount).toBe(2);
  });

  it("does NOT dedupe different kinds at the same place", () => {
    const eq = base({ id: "eq", kind: "earthquake" });
    const fl = base({ id: "fl", kind: "flood" });
    const r = rationalize([eq, fl]);
    expect(r.deduped).toBe(0);
    expect(r.alerts).toHaveLength(2);
  });

  it("flood-suppresses beyond maxPerBand and reports the count", () => {
    // 7 identical-priority, non-duplicate alerts (spread apart so they don't merge).
    const many = Array.from({ length: 7 }, (_, i) =>
      base({ id: `m${i}`, kind: "wildfire", severity: 2, lat: i * 2, lon: i * 2, time: 1_000_000 + i }),
    );
    const r = rationalize(many, { maxPerBand: 5 });
    expect(r.alerts.length).toBe(5);
    expect(r.suppressed).toBe(2);
  });

  it("orders by priority, then proximity", () => {
    const origin = { lat: 0, lon: 0 };
    const strongFar = base({ id: "strongFar", severity: 4, lat: 5, lon: 5 });
    const weakNear = base({ id: "weakNear", severity: 1, lat: 0.1, lon: 0 });
    const r = rationalize([weakNear, strongFar], { origin, radiusKm: 5000 });
    expect(r.alerts[0].id).toBe("strongFar"); // higher priority first
    expect(r.alerts[0].priorityLabel).toBe("Critical");
  });

  it("attaches an actionable next step to every alert", () => {
    const r = rationalize([base({ kind: "flood" })]);
    expect(r.alerts[0].action).toMatch(/water|low ground/i);
  });

  it("byPriority counts sum to the shown alerts", () => {
    const r = rationalize([base({ severity: 4 }), base({ severity: 1, lat: 9, lon: 9 })]);
    const sum = Object.values(r.byPriority).reduce((n, x) => n + x, 0);
    expect(sum).toBe(r.alerts.length);
  });
});
