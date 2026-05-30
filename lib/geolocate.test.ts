import { describe, it, expect } from "vitest";
import {
  haversineMeters,
  classifyElements,
  clusterByCooccurrence,
  buildOverpassQuery,
  featureLabel,
  type OsmElement,
} from "./geolocate";

describe("haversineMeters", () => {
  it("is 0 for identical points", () => {
    expect(haversineMeters({ lat: 50, lon: 8 }, { lat: 50, lon: 8 })).toBe(0);
  });
  it("≈111.2 km per degree of latitude", () => {
    const d = haversineMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe("classifyElements", () => {
  const els: OsmElement[] = [
    { type: "node", id: 1, lat: 52.5, lon: 13.4, tags: { amenity: "fuel" } },
    { type: "node", id: 2, lat: 52.5, lon: 13.4, tags: { amenity: "place_of_worship", religion: "muslim" } },
    { type: "node", id: 3, lat: 52.5, lon: 13.4, tags: { amenity: "cafe" } }, // not requested
    { type: "node", id: 4, tags: { amenity: "fuel" } }, // no coords → dropped
    { type: "way", id: 5, center: { lat: 52.5, lon: 13.4 }, tags: { leisure: "stadium" } }, // way centroid
  ];

  it("keeps only requested types with coordinates", () => {
    const out = classifyElements(els, ["fuel", "mosque", "stadium"]);
    expect(out.map((f) => f.id).sort()).toEqual([1, 2, 5]);
  });
  it("tags each feature with the type ids it matched", () => {
    const out = classifyElements(els, ["fuel", "mosque"]);
    expect(out.find((f) => f.id === 1)?.typeIds).toEqual(["fuel"]);
    expect(out.find((f) => f.id === 2)?.typeIds).toEqual(["mosque"]);
  });
  it("accepts way/relation centroids via `center`", () => {
    const out = classifyElements(els, ["stadium"]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 5, lat: 52.5, lon: 13.4 });
  });
  it("ignores unknown requested type ids", () => {
    expect(classifyElements(els, ["not_a_type"])).toEqual([]);
  });
});

describe("clusterByCooccurrence", () => {
  // Two tight clusters ~30km apart. Cluster A has 3 types, cluster B has 2.
  const features = classifyElements(
    [
      { type: "node", id: 1, lat: 52.5000, lon: 13.4000, tags: { amenity: "fuel" } },
      { type: "node", id: 2, lat: 52.5005, lon: 13.4005, tags: { amenity: "pharmacy" } },
      { type: "node", id: 3, lat: 52.5008, lon: 13.4008, tags: { amenity: "place_of_worship", religion: "muslim" } },
      // Cluster B (~30 km east): fuel + pharmacy only
      { type: "node", id: 4, lat: 52.5000, lon: 13.8000, tags: { amenity: "fuel" } },
      { type: "node", id: 5, lat: 52.5004, lon: 13.8004, tags: { amenity: "pharmacy" } },
    ],
    ["fuel", "pharmacy", "mosque"],
  );

  it("ranks the richer cluster first", () => {
    const clusters = clusterByCooccurrence(features, ["fuel", "pharmacy", "mosque"], 300);
    expect(clusters.length).toBeGreaterThanOrEqual(2);
    expect(clusters[0].matchedCount).toBe(3);
    expect(clusters[0].matchedTypeIds).toEqual(["fuel", "mosque", "pharmacy"]);
    expect(clusters[1].matchedCount).toBe(2);
  });

  it("suppresses overlapping candidates (one cluster per location)", () => {
    const clusters = clusterByCooccurrence(features, ["fuel", "pharmacy", "mosque"], 300);
    // Despite 5 seed points, NMS collapses each location to a single cluster.
    expect(clusters).toHaveLength(2);
  });

  it("respects the radius — too-small radius yields no multi-type cluster", () => {
    const clusters = clusterByCooccurrence(features, ["fuel", "pharmacy", "mosque"], 5);
    expect(clusters).toHaveLength(0); // nothing co-occurs within 5 m
  });

  it("a single-type search still returns hits (minTypes capped at requested)", () => {
    const fuelOnly = classifyElements(
      [{ type: "node", id: 9, lat: 1, lon: 1, tags: { amenity: "fuel" } }],
      ["fuel"],
    );
    const clusters = clusterByCooccurrence(fuelOnly, ["fuel"], 100);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].matchedTypeIds).toEqual(["fuel"]);
  });

  it("centroid sits among the members", () => {
    const clusters = clusterByCooccurrence(features, ["fuel", "pharmacy", "mosque"], 300);
    const top = clusters[0];
    expect(top.lat).toBeGreaterThan(52.49);
    expect(top.lat).toBeLessThan(52.51);
    expect(top.spreadMeters).toBeGreaterThanOrEqual(0);
  });
});

describe("buildOverpassQuery", () => {
  const bbox = { s: 52.4, w: 13.3, n: 52.6, e: 13.5 };

  it("emits node/way/relation for each requested type with the bbox + out center", () => {
    const q = buildOverpassQuery(["fuel"], bbox);
    expect(q).toContain("[out:json]");
    expect(q).toContain('node["amenity"="fuel"](52.4,13.3,52.6,13.5);');
    expect(q).toContain('way["amenity"="fuel"](52.4,13.3,52.6,13.5);');
    expect(q).toContain('relation["amenity"="fuel"](52.4,13.3,52.6,13.5);');
    expect(q).toContain("out center tags;");
  });

  it("expands multi-selector types (bank → bank + atm)", () => {
    const q = buildOverpassQuery(["bank"], bbox);
    expect(q).toContain('node["amenity"="bank"]');
    expect(q).toContain('node["amenity"="atm"]');
  });

  it("returns empty string when no known type is requested", () => {
    expect(buildOverpassQuery(["nope"], bbox)).toBe("");
  });
});

describe("featureLabel", () => {
  it("maps a known id to its label", () => {
    expect(featureLabel("mosque")).toBe("Mosque / minaret");
  });
  it("falls back to the id for unknown features", () => {
    expect(featureLabel("xyz")).toBe("xyz");
  });
});
