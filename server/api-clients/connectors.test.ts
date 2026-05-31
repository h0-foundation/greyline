import { describe, it, expect } from "vitest";
import { parseFireCsv } from "./firms";
import { normalizeStation, type OpenAqLocation } from "./openaq";

// Pure parsers for the key-required connectors — the part most likely to drift
// from the upstream shape, tested without keys or network.
describe("FIRMS CSV parser", () => {
  const csv = [
    "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight",
    "34.5,-118.2,330.1,0.4,0.4,2026-05-30,1012,N,h,2.0NRT,295.0,12.7,D",
    "-3.1,29.9,310.0,0.5,0.5,2026-05-30,2230,N,n,2.0NRT,280.0,4.1,N",
    "bad,row,,,,,,,,,,,",
  ].join("\n");

  it("parses rows by header index and skips invalid coords", () => {
    const fires = parseFireCsv(csv);
    expect(fires).toHaveLength(2);
    expect(fires[0]).toMatchObject({ lat: 34.5, lng: -118.2, frp: 12.7, confidence: "h", daynight: "D" });
    expect(fires[1].daynight).toBe("N");
  });

  it("returns empty for blank or header-only input", () => {
    expect(parseFireCsv("")).toHaveLength(0);
    expect(parseFireCsv("latitude,longitude,frp")).toHaveLength(0);
  });
});

describe("OpenAQ station normalizer", () => {
  it("extracts coords, country, and de-duped parameters", () => {
    const loc: OpenAqLocation = {
      id: 7,
      name: "Central Station",
      locality: "Downtown",
      country: { name: "France", code: "FR" },
      coordinates: { latitude: 48.85, longitude: 2.35 },
      sensors: [{ parameter: { name: "pm25" } }, { parameter: { name: "pm25" } }, { parameter: { name: "no2" } }],
    };
    const s = normalizeStation(loc)!;
    expect(s).toMatchObject({ id: 7, name: "Central Station", country: "France", lat: 48.85, lng: 2.35 });
    expect(s.parameters).toEqual(["pm25", "no2"]);
  });

  it("returns null when coordinates are missing", () => {
    expect(normalizeStation({ id: 1, name: "x", coordinates: null })).toBeNull();
    expect(normalizeStation({ id: 1, name: "x" })).toBeNull();
  });

  it("handles a string country and absent sensors", () => {
    const s = normalizeStation({ name: "S", country: "Kenya", coordinates: { latitude: -1.3, longitude: 36.8 } })!;
    expect(s.country).toBe("Kenya");
    expect(s.parameters).toEqual([]);
  });
});
