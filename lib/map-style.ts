/**
 * Offline-first basemap for MapLibre. The committed `public/geo/world.pmtiles`
 * (Natural Earth, z0–6, built by scripts/build-tiles.ts) renders with ZERO
 * external network — the app's map works air-gapped by default. Online raster
 * tiles (CARTO) and satellite/radar remain opt-in layers added on top.
 *
 * Shared by components/map/map-view.tsx and components/field/route-planner.tsx
 * so both speak the same offline basemap (no duplicated style).
 */
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";

let registered = false;

/** Register the pmtiles:// protocol with MapLibre. Idempotent per page load. */
export function registerPmtiles(): void {
  if (registered) return;
  maplibregl.addProtocol("pmtiles", new Protocol().tile);
  registered = true;
}

// Same-origin absolute path → Next serves public/geo/world.pmtiles with HTTP
// range support, which PMTiles needs for partial reads.
export const WORLD_PMTILES_URL = "pmtiles:///geo/world.pmtiles";

// Free CARTO dark raster tiles (OSM-derived) — the opt-in "detailed online
// tiles" overlay for connected, zoomed-in work. Never fetched unless toggled.
export const CARTO_DARK_TILES = [
  "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
  "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
  "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
  "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
];

/**
 * Dark vector basemap in the "Oak & Gold" palette. Layer ids match the
 * tippecanoe -L names in scripts/build-tiles.ts: land/countries/boundaries/
 * lakes/rivers/places. Cities are circle dots (no glyph dependency) so the
 * basemap stays fully air-gapped. `registerPmtiles()` must run first.
 */
export function worldBaseStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      world: { type: "vector", url: WORLD_PMTILES_URL },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#0c0f0e" } },
      { id: "land", type: "fill", source: "world", "source-layer": "land", paint: { "fill-color": "#15181a" } },
      { id: "lakes", type: "fill", source: "world", "source-layer": "lakes", paint: { "fill-color": "#0e1416" } },
      { id: "rivers", type: "line", source: "world", "source-layer": "rivers", paint: { "line-color": "#27424a", "line-width": 0.5, "line-opacity": 0.5 } },
      { id: "country-borders", type: "line", source: "world", "source-layer": "boundaries", paint: { "line-color": "#3a4a3f", "line-width": 0.6, "line-opacity": 0.7 } },
      {
        id: "place-dots",
        type: "circle",
        source: "world",
        "source-layer": "places",
        minzoom: 2,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 1, 6, 2.4],
          "circle-color": "#e0b24a",
          "circle-opacity": 0.7,
        },
      },
    ],
  };
}
