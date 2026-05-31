"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Plane, Activity, Cctv, MapPin, Plus, X, Satellite, CloudRain, TriangleAlert, Map as MapIcon, Layers, Trash2, Maximize, Route as RouteIcon, Swords, Wind, Flame, Gauge, Search, PanelLeftClose, PanelLeftOpen, Crosshair } from "lucide-react";
import { PMTiles } from "pmtiles";
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from "react-resizable-panels";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cameraCones, cameraCounts, classifyCamera, type CameraKind } from "@/lib/camera-coverage";
import { registerPmtiles, worldBaseStyle, streetPackLayers, CARTO_DARK_TILES } from "@/lib/map-style";
import { routeMetrics, ROUTE_TYPES, formatDistance, type RouteType, type LngLat } from "@/lib/route-planning";
import { cn } from "@/lib/utils";

type Pack = { id: string; region: string | null; path: string };

export type MapMarker = { id: string; type: "destination" | "rally" | "sighting"; lat: number; lng: number; label: string };
type Marker = MapMarker;
type Aircraft = { hex: string; flight?: string; lat?: number; lon?: number; alt_baro?: number; gs?: number; track?: number; type?: string };
type Quake = { properties: { mag: number; place: string; url: string; tsunami: number }; geometry: { coordinates: [number, number, number] } };
type Camera = { lat: number; lon: number } & Record<string, unknown>;
type Disaster = { geometry: { coordinates: [number, number] }; properties: { eventtype: string; name: string; htmldescription: string; alertlevel?: string; url?: { report?: string } } };
type ConflictEvent = { lat: number; lng: number; year: number; deaths: number; type_of_violence: number; country: string | null; conflict_name: string | null; date_start: string | null };
type EmscQuake = { geometry: { coordinates: [number, number, number] }; properties: { mag: number; magtype?: string; flynn_region?: string; time?: string } };
type NwsAlert = { geometry: unknown; properties: { event: string; severity: string; headline?: string; areaDesc?: string; expires?: string } };
type FirePoint = { lat: number; lng: number; frp: number; confidence: string; acq_date: string; acq_time: string; daynight: string };
type AirStation = { id: number; name: string; locality: string | null; country: string | null; lat: number; lng: number; parameters: string[] };
type SavedRoute = { id: string; type: string; distance_m: number | null; waypoints: LngLat[] };
type SearchResult = { label: string; sub: string; lat: number; lng: number };

// NWS alert severity → CVD-safe fill (paired with the severity word in the popup).
const NWS_SEVERITY_COLOR: Record<string, string> = { Extreme: "#c0392b", Severe: "#e06a5a", Moderate: "#e0992a", Minor: "#e0b24a", Unknown: "#9aa39c" };

// Marker-based live layers and their backing connector ids.
type MarkerLayer = "cameras" | "aircraft" | "quakes" | "disasters" | "emsc";
const MARKER_LAYER_API: Record<MarkerLayer, string> = {
  cameras: "overpass", aircraft: "adsb", quakes: "usgs", disasters: "gdacs", emsc: "emsc",
};

const DISASTER_GLYPH: Record<string, string> = { EQ: "⊙", TC: "🌀", FL: "🌊", VO: "🌋", WF: "🔥", DR: "☀" };
const ALERT_COLOR: Record<string, string> = { Red: "#e06a5a", Orange: "#e0992a", Green: "#74b277" };

const MARKER_COLOR: Record<Marker["type"], string> = {
  destination: "#74b277",
  rally: "#74b277",
  sighting: "#e06a5a",
};

// The basemap is the committed offline vector world (lib/map-style →
// public/geo/world.pmtiles), so the OSINT map renders fully air-gapped by
// default. Online detail (CARTO), satellite, and radar are opt-in layers added
// on top in map.on("load").

// NASA GIBS true-color satellite imagery (free, no key). Added as a hidden layer
// and toggled to visible. Uses yesterday's pass to guarantee availability.
function gibsDate(): string {
  const d = new Date(Date.now() - 36 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function dot(color: string, size = 12) {
  const el = document.createElement("div");
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 0 2px rgba(0,0,0,0.4),0 0 8px ${color}66;cursor:pointer`;
  return el;
}

// Numbered amber pin for an ordered route waypoint (mirrors the route planner).
function numDot(n: number) {
  const el = document.createElement("div");
  el.textContent = String(n);
  el.style.cssText = "width:18px;height:18px;border-radius:50%;background:#e0b24a;color:#1a1a1a;font:600 11px system-ui;display:grid;place-items:center;box-shadow:0 0 0 2px rgba(0,0,0,.45);cursor:default";
  return el;
}

// ALPR plate-readers are a crimson SQUARE; ordinary CCTV an amber dot. The
// shape difference is the colour-blind-safe redundant cue (it survives
// grayscale), per research/UX_INTELLIGENCE_DASHBOARDS.md.
function cameraEl(kind: CameraKind) {
  if (kind === "alpr") {
    const el = document.createElement("div");
    el.style.cssText = "width:11px;height:11px;background:#e06a5a;box-shadow:0 0 0 1.5px rgba(0,0,0,0.5),0 0 6px #e06a5a88;cursor:pointer";
    return el;
  }
  return dot("#e0b24a", 10);
}

export function MapView({ markers }: { markers: Marker[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const layerMarkers = useRef<Record<string, maplibregl.Marker[]>>({ base: [], cameras: [], quakes: [], disasters: [], emsc: [], air: [], custom: [] });
  const planes = useRef<Map<string, { tlng: number; tlat: number; lng: number; lat: number; marker: maplibregl.Marker; el: HTMLDivElement }>>(new Map());
  const trails = useRef<Map<string, [number, number][]>>(new Map());
  const rafRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const draftRouteRef = useRef<LngLat[]>([]);
  const draftRouteMarkers = useRef<maplibregl.Marker[]>([]);
  // Per-layer fetch generation. Bumped when a layer is cleared so an in-flight
  // request that resolves afterwards can detect it's stale and not re-add markers.
  const fetchGen = useRef<Record<string, number>>({});
  // Conflict is bundled offline data (no connector), loaded once into a native
  // circle layer — toggling just flips its visibility.
  const conflictLoaded = useRef(false);
  // Felt-style docked panel: resizable/collapsible. A single transient marker
  // marks the last search hit.
  const panelRef = useRef<ImperativePanelHandle>(null);
  const searchMarker = useRef<maplibregl.Marker | null>(null);

  const [ready, setReady] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [tab, setTab] = useState("layers");
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [showRoutes, setShowRoutes] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [layers, setLayers] = useState({ base: true, cameras: false, aircraft: false, quakes: false, disasters: false, conflict: false, emsc: false, nws: false, fires: false, air: false });
  const [satellite, setSatellite] = useState(false);
  const [radar, setRadar] = useState(false);
  const [detail, setDetail] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [cameraStats, setCameraStats] = useState<{ total: number; alpr: number } | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [packFile, setPackFile] = useState("");
  const [packName, setPackName] = useState("");
  const [packErr, setPackErr] = useState<string | null>(null);
  const [drawingRoute, setDrawingRoute] = useState(false);
  const [draftRoute, setDraftRoute] = useState<LngLat[]>([]);
  const [routeType, setRouteType] = useState<RouteType>("sdr");

  function clearCones() {
    const src = mapRef.current?.getSource("camera-cones") as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: "FeatureCollection", features: [] });
    setCameraStats(null);
  }

  function toggleSatellite(on: boolean) {
    setSatellite(on);
    mapRef.current?.setLayoutProperty("satellite", "visibility", on ? "visible" : "none");
  }

  function toggleDetail(on: boolean) {
    setDetail(on);
    mapRef.current?.setLayoutProperty("carto", "visibility", on ? "visible" : "none");
  }

  // ---- regional street packs (offline .pmtiles in the data dir) ----
  // Each pack is a vector source over /api/tiles/<id>; MapLibre only requests
  // tiles where the pack has data, so streets render inside its bbox and the
  // world base shows elsewhere. Pack layers sit under the online raster overlays
  // (carto/satellite) so toggling those still composites correctly.
  function addPackLayers(map: maplibregl.Map, b: Pack) {
    if (map.getSource(b.id)) return;
    map.addSource(b.id, { type: "vector", url: `pmtiles:///api/tiles/${b.id}` });
    const before = map.getLayer("carto") ? "carto" : undefined;
    for (const layer of streetPackLayers(b.id)) map.addLayer(layer, before);
  }

  function removePackLayers(map: maplibregl.Map, id: string) {
    for (const layer of streetPackLayers(id)) if (map.getLayer(layer.id)) map.removeLayer(layer.id);
    if (map.getSource(id)) map.removeSource(id);
  }

  async function registerPack() {
    setPackErr(null);
    const res = await fetch("/api/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: packFile.trim(), name: packName.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setPackErr(data.error || "Could not register the pack.");
      return;
    }
    const b = data.bundle as Pack;
    setPacks((p) => [b, ...p.filter((x) => x.id !== b.id)]);
    if (mapRef.current) addPackLayers(mapRef.current, b);
    setPackFile("");
    setPackName("");
  }

  async function unregisterPack(id: string) {
    setPacks((p) => p.filter((x) => x.id !== id));
    if (mapRef.current) removePackLayers(mapRef.current, id);
    await fetch(`/api/bundles/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function fitPack(b: Pack) {
    try {
      const h = await new PMTiles(`/api/tiles/${b.id}`).getHeader();
      mapRef.current?.fitBounds([[h.minLon, h.minLat], [h.maxLon, h.maxLat]], { padding: 40, animate: true });
    } catch {
      setPackErr("Couldn't read this pack's bounds.");
    }
  }

  // ---- offline route drawing (SDR / egress) — waypoints stay on-device; the
  // same planner lives at /tools/route-planner. Reuses lib/route-planning. ----
  function updateDraftRouteLine() {
    const src = mapRef.current?.getSource("draft-route") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const coords = draftRouteRef.current.map((p) => [p.lng, p.lat]);
    src.setData(
      coords.length >= 2
        ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } }] }
        : { type: "FeatureCollection", features: [] },
    );
  }

  function clearDraftRoute() {
    draftRouteRef.current = [];
    setDraftRoute([]);
    draftRouteMarkers.current.forEach((mk) => mk.remove());
    draftRouteMarkers.current = [];
    updateDraftRouteLine();
  }

  async function loadSavedRoutes() {
    const map = mapRef.current;
    if (!map) return;
    try {
      const data = (await (await fetch("/api/routes")).json()) as { routes?: { id: string; type: string; waypoints: string; distance_m: number | null }[] };
      const parsed: SavedRoute[] = (data.routes ?? []).map((r) => {
        let pts: LngLat[] = [];
        try { pts = (JSON.parse(r.waypoints) as LngLat[]).filter((p) => Number.isFinite(p?.lng) && Number.isFinite(p?.lat)); } catch { pts = []; }
        return { id: r.id, type: r.type, distance_m: r.distance_m, waypoints: pts };
      });
      setSavedRoutes(parsed);
      const features = parsed
        .filter((r) => r.waypoints.length >= 2)
        .map((r) => ({ type: "Feature" as const, properties: { type: r.type }, geometry: { type: "LineString" as const, coordinates: r.waypoints.map((p) => [p.lng, p.lat]) } }));
      (map.getSource("saved-routes") as maplibregl.GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    } catch { /* offline-first — leave empty */ }
  }

  // ---- Felt panel: collapse, resize, fit/delete routes, offline search ----
  function resizeMap() { requestAnimationFrame(() => mapRef.current?.resize()); }

  function togglePanel() {
    const p = panelRef.current;
    if (!p) return;
    if (p.isCollapsed()) p.expand();
    else p.collapse();
  }

  function fitRoute(pts: LngLat[]) {
    const map = mapRef.current;
    if (!map || pts.length === 0) return;
    const b = new maplibregl.LngLatBounds();
    pts.forEach((p) => b.extend([p.lng, p.lat]));
    map.fitBounds(b, { padding: 80, maxZoom: 14, animate: true });
  }

  async function deleteRoute(id: string) {
    setSavedRoutes((rs) => rs.filter((r) => r.id !== id));
    await fetch(`/api/routes/${id}`, { method: "DELETE" }).catch(() => {});
    loadSavedRoutes();
  }

  function toggleRoutesVisibility(on: boolean) {
    setShowRoutes(on);
    mapRef.current?.setLayoutProperty("saved-routes", "visibility", on ? "visible" : "none");
  }

  function flyToResult(r: SearchResult) {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [r.lng, r.lat], zoom: 11, essential: true });
    searchMarker.current?.remove();
    searchMarker.current = new maplibregl.Marker({ element: dot("#e0b24a", 13) })
      .setLngLat([r.lng, r.lat])
      .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`<div style="font:600 13px system-ui">${escapeHtml(r.label)}</div><div style="font:11px system-ui;color:#888">${escapeHtml(r.sub)}</div>`))
      .addTo(map);
  }

  // Offline place search over the bundled GeoNames gazetteer (/api/cities) — no
  // network, no connector. The same data backs /api/geocode's offline fallback.
  async function doSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const data = (await (await fetch(`/api/cities?q=${encodeURIComponent(q)}`)).json()) as {
        cities?: { name: string; admin1_code: string | null; country_code: string | null; lat: number; lng: number }[];
      };
      setResults((data.cities ?? []).slice(0, 12).map((c) => ({
        label: c.name,
        sub: [c.admin1_code, c.country_code].filter(Boolean).join(" · "),
        lat: c.lat, lng: c.lng,
      })));
    } catch { setResults([]); }
    setSearching(false);
  }

  async function saveRoute() {
    const pts = draftRouteRef.current;
    if (pts.length < 2) return;
    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: routeType, waypoints: pts, distance_m: routeMetrics(pts).totalM }),
    });
    if (res.ok) {
      clearDraftRoute();
      setDrawingRoute(false);
      loadSavedRoutes();
    }
  }

  async function toggleRadar(on: boolean) {
    setRadar(on);
    const map = mapRef.current;
    if (!map) return;
    if (on) {
      try {
        const meta = await fetch("https://api.rainviewer.com/public/weather-maps.json").then((r) => r.json());
        const frames = meta?.radar?.past ?? [];
        const last = frames[frames.length - 1];
        if (last && meta.host) {
          if (map.getLayer("radar")) map.removeLayer("radar");
          if (map.getSource("radar")) map.removeSource("radar");
          map.addSource("radar", { type: "raster", tileSize: 256, tiles: [`${meta.host}${last.path}/256/{z}/{x}/{y}/2/1_1.png`] });
          map.addLayer({ id: "radar", type: "raster", source: "radar", paint: { "raster-opacity": 0.6 } });
          setNotes((n) => ({ ...n, radar: "" }));
          return;
        }
      } catch { /* fall through */ }
      setNotes((n) => ({ ...n, radar: "err" }));
    } else if (map.getLayer("radar")) {
      map.setLayoutProperty("radar", "visibility", "none");
    }
  }

  // ---- init map ----
  useEffect(() => {
    if (!ref.current) return;
    registerPmtiles();
    const map = new maplibregl.Map({
      container: ref.current,
      style: worldBaseStyle(),
      center: markers[0] ? [markers[0].lng, markers[0].lat] : [10, 25],
      zoom: markers[0] ? 3 : 1.4,
      maxZoom: 18,
      attributionControl: false,
      dragRotate: false,
    });
    mapRef.current = map;
    map.on("error", () => {});
    map.on("load", () => {
      if (markers.length > 1) {
        const b = new maplibregl.LngLatBounds();
        markers.forEach((m) => b.extend([m.lng, m.lat]));
        map.fitBounds(b, { padding: 60, animate: false, maxZoom: 6 });
      }
      // Optional detailed online raster tiles (CARTO), hidden until toggled —
      // full road/label detail when connected; never fetched unless enabled.
      map.addSource("carto", { type: "raster", tileSize: 256, tiles: CARTO_DARK_TILES, attribution: "© OpenStreetMap contributors © CARTO" });
      map.addLayer({ id: "carto", type: "raster", source: "carto", layout: { visibility: "none" } });
      // Satellite imagery (NASA GIBS), hidden until toggled.
      map.addSource("satellite", {
        type: "raster", tileSize: 256, maxzoom: 8,
        tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${gibsDate()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`],
        attribution: "Imagery © NASA EOSDIS GIBS",
      });
      map.addLayer({ id: "satellite", type: "raster", source: "satellite", layout: { visibility: "none" } });
      // Weather radar (RainViewer), hidden until toggled (tiles set on enable).
      map.addSource("radar", { type: "raster", tileSize: 256, tiles: ["https://tilecache.rainviewer.com/v2/radar/0/256/{z}/{x}/{y}/2/1_1.png"] });
      map.addLayer({ id: "radar", type: "raster", source: "radar", paint: { "raster-opacity": 0.6 }, layout: { visibility: "none" } });
      map.addSource("trails", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "trails", type: "line", source: "trails", paint: { "line-color": "#7fb2ff", "line-width": 1.5, "line-opacity": 0.45 } });
      // Camera field-of-view coverage cones (drawn from camera:direction). ALPR
      // plate-readers are tinted distinctly from CCTV — the marker shape carries
      // the same distinction so it survives colour-blindness / grayscale.
      map.addSource("camera-cones", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "camera-cones-fill", type: "fill", source: "camera-cones", paint: { "fill-color": ["match", ["get", "kind"], "alpr", "#e06a5a", "#e0b24a"], "fill-opacity": 0.14 } });
      map.addLayer({ id: "camera-cones-line", type: "line", source: "camera-cones", paint: { "line-color": ["match", ["get", "kind"], "alpr", "#e06a5a", "#e0b24a"], "line-width": 1, "line-opacity": 0.5 } });
      // Offline route layers: saved routes (coloured by type) + the in-progress draft.
      map.addSource("saved-routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "saved-routes", type: "line", source: "saved-routes", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": ["match", ["get", "type"], "sdr", "#e0b24a", "extraction", "#74b277", "variation", "#7fb2ff", "#9aa39c"], "line-width": 3, "line-opacity": 0.85 } });
      map.addSource("draft-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "draft-route", type: "line", source: "draft-route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#f0f0f0", "line-width": 2, "line-dasharray": [2, 1.5], "line-opacity": 0.9 } });
      // Armed-conflict events (UCDP, bundled offline). A native circle layer —
      // thousands of points stay smooth where DOM markers would jank. Radius
      // scales with the fatality count; click for the event detail.
      map.addSource("conflict", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "conflict-pts", type: "circle", source: "conflict", layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["log10", ["max", 1, ["get", "deaths"]]], 0, 3, 1, 6, 2, 11, 3, 18, 4, 26],
          "circle-color": "#c0392b", "circle-opacity": 0.45,
          "circle-stroke-color": "#7d1f15", "circle-stroke-width": 0.75,
        },
      });
      map.on("click", "conflict-pts", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        if (f.geometry.type !== "Point") return;
        new maplibregl.Popup({ offset: 8 }).setLngLat(f.geometry.coordinates as [number, number]).setHTML(conflictPopup(f.properties as ConflictEvent)).addTo(map);
      });
      map.on("mouseenter", "conflict-pts", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "conflict-pts", () => { map.getCanvas().style.cursor = ""; });
      // US NWS weather alerts (live, connector-gated) as severity-tinted zones.
      // Polygons, so a native fill+line layer; loaded on toggle.
      map.addSource("nws", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "nws-fill", type: "fill", source: "nws", layout: { visibility: "none" },
        paint: { "fill-color": ["match", ["get", "severity"], "Extreme", "#c0392b", "Severe", "#e06a5a", "Moderate", "#e0992a", "Minor", "#e0b24a", "#9aa39c"], "fill-opacity": 0.22 },
      });
      map.addLayer({
        id: "nws-line", type: "line", source: "nws", layout: { visibility: "none" },
        paint: { "line-color": ["match", ["get", "severity"], "Extreme", "#c0392b", "Severe", "#e06a5a", "Moderate", "#e0992a", "Minor", "#e0b24a", "#9aa39c"], "line-width": 1, "line-opacity": 0.6 },
      });
      map.on("click", "nws-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        new maplibregl.Popup({ offset: 4 }).setLngLat(e.lngLat).setHTML(nwsPopup(f.properties as NwsAlert["properties"])).addTo(map);
      });
      map.on("mouseenter", "nws-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "nws-fill", () => { map.getCanvas().style.cursor = ""; });
      // NASA FIRMS active fires (live, key-gated). Native circle layer — there can
      // be tens of thousands of hotspots; radius scales with fire radiative power.
      map.addSource("fires", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "fire-pts", type: "circle", source: "fires", layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["sqrt", ["max", 0, ["get", "frp"]]], 0, 2.5, 5, 5, 15, 9, 30, 14],
          "circle-color": "#e0662a", "circle-opacity": 0.55, "circle-stroke-color": "#7d2f10", "circle-stroke-width": 0.4,
        },
      });
      map.on("click", "fire-pts", (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        new maplibregl.Popup({ offset: 6 }).setLngLat(f.geometry.coordinates as [number, number]).setHTML(firePopup(f.properties as FirePoint)).addTo(map);
      });
      map.on("mouseenter", "fire-pts", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "fire-pts", () => { map.getCanvas().style.cursor = ""; });
      setReady(true);
    });

    // smooth glide loop for aircraft (lerp shown position toward target)
    const tick = () => {
      planes.current.forEach((p) => {
        p.lng += (p.tlng - p.lng) * 0.12;
        p.lat += (p.tlat - p.lat) * 0.12;
        p.marker.setLngLat([p.lng, p.lat]);
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- load + render registered street packs when ready ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bundles");
        const data = (await res.json()) as { bundles?: Pack[] };
        if (cancelled) return;
        const street = (data.bundles ?? []).filter((b) => b.id !== "map-world");
        setPacks(street);
        for (const b of street) addPackLayers(map, b);
      } catch {
        /* offline-first — no packs is fine */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ---- base markers ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    layerMarkers.current.base.forEach((m) => m.remove());
    layerMarkers.current.base = [];
    if (!layers.base) return;
    for (const m of markers) {
      const mk = new maplibregl.Marker({ element: dot(MARKER_COLOR[m.type]) })
        .setLngLat([m.lng, m.lat])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`<div style="font:600 13px system-ui">${escapeHtml(m.label)}</div><div style="font:11px ui-monospace;color:#888;text-transform:capitalize">${m.type}</div>`))
        .addTo(map);
      layerMarkers.current.base.push(mk);
    }
  }, [markers, layers.base, ready]);

  // ---- toggle a live layer: also enable/disable the underlying connection ----
  async function setLayer(key: MarkerLayer, on: boolean) {
    setLayers((s) => ({ ...s, [key]: on }));
    const apiId = MARKER_LAYER_API[key];
    await fetch("/api/toggles", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_id: apiId, enabled: on }),
    }).catch(() => {});
    if (on) refreshLayer(key);
    else clearLayer(key);
  }

  function clearLayer(key: MarkerLayer) {
    const map = mapRef.current;
    // Invalidate any in-flight fetch for this layer (it'll bail on resolve).
    fetchGen.current[key] = (fetchGen.current[key] ?? 0) + 1;
    if (key === "aircraft") {
      planes.current.forEach((p) => p.marker.remove());
      planes.current.clear();
      trails.current.clear();
      const src = map?.getSource("trails") as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: "FeatureCollection", features: [] });
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    } else {
      layerMarkers.current[key].forEach((m) => m.remove());
      layerMarkers.current[key] = [];
      if (key === "cameras") clearCones();
    }
    setNotes((n) => ({ ...n, [key]: "" }));
  }

  function refreshLayer(key: MarkerLayer) {
    if (key === "aircraft") {
      fetchAircraft();
      if (!pollRef.current) pollRef.current = setInterval(fetchAircraft, 20_000);
    } else if (key === "cameras") fetchCameras();
    else if (key === "disasters") fetchDisasters();
    else if (key === "emsc") fetchEmsc();
    else fetchQuakes();
  }

  async function fetchEmsc() {
    const map = mapRef.current;
    if (!map) return;
    const res = await fetch("/api/map/emsc");
    if (res.status === 503) { setNotes((n) => ({ ...n, emsc: "off" })); return; }
    setNotes((n) => ({ ...n, emsc: "" }));
    const { quakes } = (await res.json()) as { quakes: EmscQuake[] };
    layerMarkers.current.emsc.forEach((m) => m.remove());
    layerMarkers.current.emsc = [];
    for (const q of quakes ?? []) {
      const mag = q.properties.mag ?? 0;
      // Violet hue distinguishes EMSC from the red/amber USGS dots on the same map.
      const size = Math.max(8, Math.min(34, mag * 6));
      const mk = new maplibregl.Marker({ element: dot("#9b6dd6", size) }).setLngLat([q.geometry.coordinates[0], q.geometry.coordinates[1]])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`<div style="font:600 13px system-ui">M${mag.toFixed(1)} <span style="font-weight:400;color:#888">EMSC</span></div><div style="font:11px system-ui;color:#888;text-transform:capitalize">${escapeHtml((q.properties.flynn_region ?? "").toLowerCase())}</div>`))
        .addTo(map);
      layerMarkers.current.emsc.push(mk);
    }
  }

  async function fetchAircraft() {
    const map = mapRef.current;
    if (!map) return;
    const gen = fetchGen.current.aircraft ?? 0;
    const c = map.getCenter();
    const r = Math.min(250, Math.round(boundsRadiusNm(map)));
    const res = await fetch(`/api/map/aircraft?lat=${c.lat.toFixed(3)}&lon=${c.lng.toFixed(3)}&dist=${r}`);
    if (res.status === 503) { setNotes((n) => ({ ...n, aircraft: "off" })); return; }
    setNotes((n) => ({ ...n, aircraft: "" }));
    const { aircraft } = (await res.json()) as { aircraft: Aircraft[] };
    if ((fetchGen.current.aircraft ?? 0) !== gen) return; // layer toggled off mid-fetch
    const seen = new Set<string>();
    for (const a of (aircraft ?? []).slice(0, 250)) {
      if (a.lat == null || a.lon == null) continue;
      seen.add(a.hex);
      let p = planes.current.get(a.hex);
      if (!p) {
        const el = planeEl(a);
        const marker = new maplibregl.Marker({ element: el }).setLngLat([a.lon, a.lat])
          .setPopup(new maplibregl.Popup({ offset: 14 }).setHTML(planePopup(a))).addTo(map);
        p = { tlng: a.lon, tlat: a.lat, lng: a.lon, lat: a.lat, marker, el };
        planes.current.set(a.hex, p);
      } else {
        p.tlng = a.lon; p.tlat = a.lat;
        p.marker.setPopup(new maplibregl.Popup({ offset: 14 }).setHTML(planePopup(a)));
      }
      const glyph = p.el.firstElementChild as HTMLElement | null;
      if (glyph) glyph.style.transform = `rotate(${a.track ?? 0}deg)`;
      const tr = trails.current.get(a.hex) ?? [];
      tr.push([a.lon, a.lat]);
      if (tr.length > 8) tr.shift();
      trails.current.set(a.hex, tr);
    }
    planes.current.forEach((p, hex) => { if (!seen.has(hex)) { p.marker.remove(); planes.current.delete(hex); trails.current.delete(hex); } });
    const src = map.getSource("trails") as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: [...trails.current.values()].filter((t) => t.length > 1).map((coords) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: coords } })),
    });
  }

  async function fetchQuakes() {
    const map = mapRef.current;
    if (!map) return;
    const res = await fetch("/api/map/earthquakes");
    if (res.status === 503) { setNotes((n) => ({ ...n, quakes: "off" })); return; }
    setNotes((n) => ({ ...n, quakes: "" }));
    const { quakes } = (await res.json()) as { quakes: Quake[] };
    layerMarkers.current.quakes.forEach((m) => m.remove());
    layerMarkers.current.quakes = [];
    for (const q of quakes ?? []) {
      const mag = q.properties.mag ?? 0;
      const color = mag >= 5 ? "#e06a5a" : mag >= 3.5 ? "#e0b24a" : "#9aa39c";
      const size = Math.max(8, Math.min(34, mag * 6));
      const mk = new maplibregl.Marker({ element: dot(color, size) }).setLngLat([q.geometry.coordinates[0], q.geometry.coordinates[1]])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`<div style="font:600 13px system-ui">M${mag.toFixed(1)}</div><div style="font:11px system-ui;color:#888">${escapeHtml(q.properties.place ?? "")}</div>`))
        .addTo(map);
      layerMarkers.current.quakes.push(mk);
    }
  }

  async function fetchDisasters() {
    const map = mapRef.current;
    if (!map) return;
    const res = await fetch("/api/map/disasters");
    if (res.status === 503) { setNotes((n) => ({ ...n, disasters: "off" })); return; }
    setNotes((n) => ({ ...n, disasters: "" }));
    const { disasters } = (await res.json()) as { disasters: Disaster[] };
    layerMarkers.current.disasters.forEach((m) => m.remove());
    layerMarkers.current.disasters = [];
    for (const d of disasters ?? []) {
      const [lon, lat] = d.geometry?.coordinates ?? [];
      if (lon == null || lat == null) continue;
      const mk = new maplibregl.Marker({ element: disasterEl(d) }).setLngLat([lon, lat])
        .setPopup(new maplibregl.Popup({ offset: 14 }).setHTML(disasterPopup(d)))
        .addTo(map);
      layerMarkers.current.disasters.push(mk);
    }
  }

  async function fetchCameras() {
    const map = mapRef.current;
    if (!map) return;
    const gen = fetchGen.current.cameras ?? 0;
    // Surveillance cameras are sparse; a world-size bbox times out on Overpass.
    if (map.getZoom() < 8) {
      layerMarkers.current.cameras.forEach((m) => m.remove());
      layerMarkers.current.cameras = [];
      clearCones();
      setNotes((n) => ({ ...n, cameras: "zoom" }));
      return;
    }
    const b = map.getBounds();
    const res = await fetch(`/api/map/pois?south=${b.getSouth()}&west=${b.getWest()}&north=${b.getNorth()}&east=${b.getEast()}`);
    if (res.status === 503) { setNotes((n) => ({ ...n, cameras: "off" })); return; }
    setNotes((n) => ({ ...n, cameras: "" }));
    const { cameras } = (await res.json()) as { cameras: Camera[] };
    if ((fetchGen.current.cameras ?? 0) !== gen) return; // layer toggled off mid-fetch
    layerMarkers.current.cameras?.forEach((m) => m.remove());
    layerMarkers.current.cameras = [];
    const shown = (cameras ?? []).filter((c) => c.lat != null && c.lon != null).slice(0, 400);
    for (const cam of shown) {
      const kind = classifyCamera((cam.tags ?? {}) as Record<string, string>);
      const mk = new maplibregl.Marker({ element: cameraEl(kind) })
        .setLngLat([cam.lon, cam.lat])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(cameraPopup(cam, kind)))
        .addTo(map);
      layerMarkers.current.cameras.push(mk);
    }
    // Coverage cones for any camera with a known direction (dome → full circle).
    const cones = mapRef.current?.getSource("camera-cones") as maplibregl.GeoJSONSource | undefined;
    cones?.setData(cameraCones(shown));
    const counts = cameraCounts(shown);
    setCameraStats({ total: counts.total, alpr: counts.alpr });
  }

  // Armed conflict (UCDP) — bundled offline, no connector toggle. Loads once
  // into the native circle layer; toggling thereafter just flips visibility.
  async function setConflict(on: boolean) {
    setLayers((s) => ({ ...s, conflict: on }));
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("conflict-pts")) map.setLayoutProperty("conflict-pts", "visibility", on ? "visible" : "none");
    if (on && !conflictLoaded.current) {
      try {
        const res = await fetch("/api/map/conflict");
        if (!res.ok) return;
        const { events } = (await res.json()) as { events: ConflictEvent[] };
        const src = map.getSource("conflict") as maplibregl.GeoJSONSource | undefined;
        src?.setData({
          type: "FeatureCollection",
          features: (events ?? []).map((ev) => ({
            type: "Feature" as const,
            properties: { ...ev },
            geometry: { type: "Point" as const, coordinates: [ev.lng, ev.lat] },
          })),
        });
        conflictLoaded.current = true;
      } catch { /* offline-first — bundled data should always be present */ }
    }
  }

  // US NWS weather alerts — connector-gated live polygons. Enabling toggles the
  // connector, fetches active alerts, and shows the fill+line layers.
  async function setNws(on: boolean) {
    setLayers((s) => ({ ...s, nws: on }));
    const map = mapRef.current;
    await fetch("/api/toggles", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_id: "nws-alerts", enabled: on }),
    }).catch(() => {});
    if (!map) return;
    const vis = on ? "visible" : "none";
    if (map.getLayer("nws-fill")) map.setLayoutProperty("nws-fill", "visibility", vis);
    if (map.getLayer("nws-line")) map.setLayoutProperty("nws-line", "visibility", vis);
    if (!on) return;
    const res = await fetch("/api/map/nws-alerts");
    if (res.status === 503) { setNotes((n) => ({ ...n, nws: "off" })); return; }
    setNotes((n) => ({ ...n, nws: "" }));
    const { alerts } = (await res.json()) as { alerts: NwsAlert[] };
    const src = map.getSource("nws") as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: (alerts ?? []).map((a) => ({
        type: "Feature" as const,
        properties: { ...a.properties, severity: a.properties.severity || "Unknown" },
        geometry: a.geometry as GeoJSON.Geometry,
      })),
    });
  }

  // NASA FIRMS active fires — live, key-gated. Viewport-scoped (the bbox keeps
  // the hotspot CSV small). Toggling enables the connector; 503 → "off" note.
  async function setFires(on: boolean) {
    setLayers((s) => ({ ...s, fires: on }));
    const map = mapRef.current;
    await fetch("/api/toggles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_id: "nasa-firms", enabled: on }) }).catch(() => {});
    if (!map) return;
    if (map.getLayer("fire-pts")) map.setLayoutProperty("fire-pts", "visibility", on ? "visible" : "none");
    if (on) fetchFires();
  }

  async function fetchFires() {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const res = await fetch(`/api/map/fires?west=${b.getWest().toFixed(3)}&south=${b.getSouth().toFixed(3)}&east=${b.getEast().toFixed(3)}&north=${b.getNorth().toFixed(3)}`);
    if (res.status === 503) { setNotes((n) => ({ ...n, fires: "off" })); return; }
    if (!res.ok) { setNotes((n) => ({ ...n, fires: "err" })); return; }
    setNotes((n) => ({ ...n, fires: "" }));
    const { fires } = (await res.json()) as { fires: FirePoint[] };
    (map.getSource("fires") as maplibregl.GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: (fires ?? []).map((f) => ({ type: "Feature" as const, properties: { ...f }, geometry: { type: "Point" as const, coordinates: [f.lng, f.lat] } })),
    });
  }

  // OpenAQ air-quality stations — live, key-gated. Markers near the map centre.
  async function setAir(on: boolean) {
    setLayers((s) => ({ ...s, air: on }));
    await fetch("/api/toggles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_id: "openaq", enabled: on }) }).catch(() => {});
    if (on) fetchAir();
    else { layerMarkers.current.air.forEach((m) => m.remove()); layerMarkers.current.air = []; setNotes((n) => ({ ...n, air: "" })); }
  }

  async function fetchAir() {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const res = await fetch(`/api/map/air?lat=${c.lat.toFixed(4)}&lng=${c.lng.toFixed(4)}`);
    if (res.status === 503) { setNotes((n) => ({ ...n, air: "off" })); return; }
    if (!res.ok) { setNotes((n) => ({ ...n, air: "err" })); return; }
    setNotes((n) => ({ ...n, air: "" }));
    const { stations } = (await res.json()) as { stations: AirStation[] };
    layerMarkers.current.air.forEach((m) => m.remove());
    layerMarkers.current.air = [];
    for (const s of (stations ?? []).slice(0, 200)) {
      const mk = new maplibregl.Marker({ element: dot("#4aa3c9", 9) }).setLngLat([s.lng, s.lat])
        .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(airPopup(s))).addTo(map);
      layerMarkers.current.air.push(mk);
    }
  }

  // refetch viewport-bound layers on pan/zoom
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const onMove = () => { if (layers.aircraft) fetchAircraft(); if (layers.cameras) fetchCameras(); if (layers.fires) fetchFires(); if (layers.air) fetchAir(); };
    map.on("moveend", onMove);
    return () => { map.off("moveend", onMove); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, layers.aircraft, layers.cameras, layers.fires, layers.air]);

  // ---- custom point placement ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const onClick = async (e: maplibregl.MapMouseEvent) => {
      if (drawingRoute) {
        const p: LngLat = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        const next = [...draftRouteRef.current, p];
        draftRouteRef.current = next;
        setDraftRoute(next);
        const mk = new maplibregl.Marker({ element: numDot(next.length) }).setLngLat([p.lng, p.lat]).addTo(map);
        draftRouteMarkers.current.push(mk);
        updateDraftRouteLine();
        return;
      }
      if (!placing) return;
      const name = window.prompt("Name this point");
      setPlacing(false);
      if (!name) return;
      const res = await fetch("/api/rally", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, lat: e.lngLat.lat, lng: e.lngLat.lng }),
      });
      if (res.ok) {
        const mk = new maplibregl.Marker({ element: dot("#74b277") }).setLngLat([e.lngLat.lng, e.lngLat.lat])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`<div style="font:600 13px system-ui">${escapeHtml(name)}</div>`)).addTo(map);
        layerMarkers.current.custom.push(mk);
      }
    };
    map.on("click", onClick);
    map.getCanvas().style.cursor = placing || drawingRoute ? "crosshair" : "";
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") { setPlacing(false); setDrawingRoute(false); } };
    window.addEventListener("keydown", onKey);
    return () => { map.off("click", onClick); window.removeEventListener("keydown", onKey); };
  }, [placing, drawingRoute, ready]);

  // Load saved routes onto the map once it's ready.
  useEffect(() => {
    if (ready) loadSavedRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const ROUTE_META = (type: string) => ROUTE_TYPES.find((t) => t.value === type);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <PanelGroup direction="horizontal" autoSaveId="greyline-map-panel" className="h-[72vh]">
        {/* Docked, resizable, collapsible control panel (Felt-style). */}
        <Panel
          ref={panelRef}
          order={1}
          defaultSize={26}
          minSize={16}
          maxSize={42}
          collapsible
          collapsedSize={0}
          onResize={resizeMap}
          onCollapse={() => { setPanelCollapsed(true); resizeMap(); }}
          onExpand={() => { setPanelCollapsed(false); resizeMap(); }}
          className="min-w-0"
        >
          <div className="flex h-full flex-col bg-black/85 text-white backdrop-blur">
            <Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 flex-col gap-0">
              <div className="flex items-center gap-1 border-b border-white/10 p-2">
                <TabsList className="h-8 bg-white/5">
                  <TabsTrigger value="layers" className="px-2 text-xs">Layers</TabsTrigger>
                  <TabsTrigger value="features" className="px-2 text-xs">Features</TabsTrigger>
                  <TabsTrigger value="search" className="px-2 text-xs">Search</TabsTrigger>
                  <TabsTrigger value="packs" className="px-2 text-xs">Packs</TabsTrigger>
                </TabsList>
                <button type="button" onClick={togglePanel} aria-label="Collapse panel" className="ml-auto rounded p-1 text-white/50 transition-colors hover:text-white">
                  <PanelLeftClose className="size-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {/* ---- Layers ---- */}
                <TabsContent value="layers" className="mt-0">
                  <p className="label-caps mb-2 text-white/50">Basemap</p>
                  <LayerRow icon={MapIcon} color="#9aa39c" label="Detailed online tiles" on={detail} onToggle={toggleDetail} />
                  <LayerRow icon={Satellite} color="#9fd3ff" label="Satellite imagery" on={satellite} onToggle={toggleSatellite} />
                  <LayerRow icon={CloudRain} color="#7fb2ff" label="Weather radar" on={radar} onToggle={toggleRadar} note={notes.radar} />
                  <p className="label-caps mb-2 mt-3 text-white/50">Layers</p>
                  <LayerRow icon={MapPin} color="#74b277" label="Your points" on={layers.base} onToggle={(v) => setLayers((s) => ({ ...s, base: v }))} />
                  <LayerRow icon={Plane} color="#7fb2ff" label="Live aircraft" on={layers.aircraft} onToggle={(v) => setLayer("aircraft", v)} note={notes.aircraft} />
                  <LayerRow icon={Activity} color="#e06a5a" label="Earthquakes (USGS)" on={layers.quakes} onToggle={(v) => setLayer("quakes", v)} note={notes.quakes} />
                  <LayerRow icon={Activity} color="#9b6dd6" label="Earthquakes (EMSC)" on={layers.emsc} onToggle={(v) => setLayer("emsc", v)} note={notes.emsc} />
                  <LayerRow icon={Wind} color="#e0992a" label="US weather alerts (NWS)" on={layers.nws} onToggle={setNws} note={notes.nws} />
                  <LayerRow icon={Flame} color="#e0662a" label="Active fires (FIRMS)" on={layers.fires} onToggle={setFires} note={notes.fires} />
                  <LayerRow icon={Gauge} color="#4aa3c9" label="Air quality (OpenAQ)" on={layers.air} onToggle={setAir} note={notes.air} />
                  <LayerRow icon={TriangleAlert} color="#e0992a" label="Disasters (GDACS)" on={layers.disasters} onToggle={(v) => setLayer("disasters", v)} note={notes.disasters} />
                  <LayerRow icon={Swords} color="#e06a5a" label="Armed conflict (UCDP)" on={layers.conflict} onToggle={setConflict} />
                  <LayerRow icon={Cctv} color="#e0b24a" label="Cameras & ALPR" on={layers.cameras} onToggle={(v) => setLayer("cameras", v)} note={notes.cameras} />
                  {layers.cameras && cameraStats && cameraStats.total > 0 && (
                    <div className="ml-6 mb-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/55">
                      <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full" style={{ background: "#e0b24a" }} />{cameraStats.total - cameraStats.alpr} CCTV</span>
                      <span className="flex items-center gap-1"><span className="inline-block size-2" style={{ background: "#e06a5a" }} />{cameraStats.alpr} ALPR</span>
                      <span className="text-white/40">cones = field of view</span>
                    </div>
                  )}
                  <Button size="sm" variant={placing ? "default" : "outline"} className="mt-3 w-full" onClick={() => { setPlacing((p) => !p); setDrawingRoute(false); }}>
                    {placing ? <><X className="size-4" /> Cancel</> : <><Plus className="size-4" /> Add a point</>}
                  </Button>
                  <Button size="sm" variant={drawingRoute ? "default" : "outline"} className="mt-2 w-full" onClick={() => { setDrawingRoute((d) => !d); setPlacing(false); }}>
                    {drawingRoute ? <><X className="size-4" /> Stop drawing</> : <><RouteIcon className="size-4" /> Draw route</>}
                  </Button>
                  {drawingRoute && (
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {ROUTE_TYPES.map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            aria-pressed={routeType === t.value}
                            title={t.hint}
                            onClick={() => setRouteType(t.value)}
                            className={cn("rounded-md border px-2 py-1 text-xs", routeType === t.value ? "border-white/40 bg-white/15 text-white" : "border-white/15 text-white/60 hover:text-white")}
                          >
                            <span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: t.color }} />
                            {t.label}
                          </button>
                        ))}
                      </div>
                      {draftRoute.length >= 2 && (
                        <p className="text-[11px] text-white/60">{formatDistance(routeMetrics(draftRoute).totalM)} · {draftRoute.length} waypoints</p>
                      )}
                      <div className="flex gap-1.5">
                        <Button size="sm" className="flex-1" onClick={saveRoute} disabled={draftRoute.length < 2}>Save route</Button>
                        <Button size="sm" variant="outline" onClick={clearDraftRoute} disabled={draftRoute.length === 0}>Clear</Button>
                      </div>
                      <p className="text-[11px] text-white/45">Click the map to drop waypoints. Stays on your device.</p>
                    </div>
                  )}
                </TabsContent>

                {/* ---- Features: saved routes ---- */}
                <TabsContent value="features" className="mt-0 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="label-caps text-white/50">Saved routes</span>
                    <Switch checked={showRoutes} onCheckedChange={toggleRoutesVisibility} aria-label="Show saved routes" />
                  </div>
                  {savedRoutes.length === 0 ? (
                    <p className="text-[12px] text-white/45">No saved routes yet. Switch to the <span className="text-white/70">Layers</span> tab and use <span className="text-white/70">Draw route</span>.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {savedRoutes.map((r) => {
                        const meta = ROUTE_META(r.type);
                        return (
                          <li key={r.id} className="flex items-center gap-2 rounded-md border border-white/10 px-2 py-1.5 text-sm">
                            <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: meta?.color ?? "#9aa39c" }} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-white/90">{meta?.label ?? r.type}</span>
                              <span className="block text-[11px] text-white/45">{r.distance_m != null ? formatDistance(r.distance_m) : `${r.waypoints.length} waypoints`}</span>
                            </span>
                            <button type="button" onClick={() => fitRoute(r.waypoints)} aria-label="Fit route" className="shrink-0 text-white/50 hover:text-white"><Maximize className="size-4" /></button>
                            <button type="button" onClick={() => deleteRoute(r.id)} aria-label="Delete route" className="shrink-0 text-white/50 hover:text-destructive"><Trash2 className="size-4" /></button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="text-[11px] text-white/40">Routes stay on your device. Draw new ones on the Layers tab or at <Link href="/tools/route-planner" className="underline">Route planner</Link>.</p>
                </TabsContent>

                {/* ---- Search: offline gazetteer ---- */}
                <TabsContent value="search" className="mt-0 space-y-3">
                  <form onSubmit={doSearch} className="flex gap-1.5">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search places…"
                      aria-label="Search places"
                      className="min-w-0 flex-1 rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                    />
                    <Button type="submit" size="sm" aria-label="Search" disabled={query.trim().length < 2}><Search className="size-4" /></Button>
                  </form>
                  {searching && <p className="text-[12px] text-white/50">Searching…</p>}
                  {!searching && results.length > 0 && (
                    <ul className="space-y-1">
                      {results.map((r, i) => (
                        <li key={`${r.label}-${i}`}>
                          <button type="button" onClick={() => flyToResult(r)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/10">
                            <Crosshair className="size-3.5 shrink-0 text-white/40" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-white/90">{r.label}</span>
                              {r.sub && <span className="block truncate text-[11px] text-white/45">{r.sub}</span>}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!searching && query.trim().length >= 2 && results.length === 0 && (
                    <p className="text-[12px] text-white/45">No matches in the offline gazetteer.</p>
                  )}
                  <p className="text-[11px] text-white/40">Offline GeoNames gazetteer — no network, no connector.</p>
                </TabsContent>

                {/* ---- Packs: offline street tiles ---- */}
                <TabsContent value="packs" className="mt-0 space-y-3">
                  <p className="text-[12px] leading-relaxed text-white/55">
                    Add a regional street-level <code className="text-[11px]">.pmtiles</code> for full detail offline. Draw an area at{" "}
                    <a href="https://app.protomaps.com" target="_blank" rel="noopener noreferrer" className="underline">app.protomaps.com</a>, save it into{" "}
                    <code className="text-[11px]">data/bundles/maps/</code>, then register it by filename. Nothing is uploaded.
                  </p>
                  {packs.length > 0 && (
                    <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
                      {packs.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 px-2.5 py-2 text-sm">
                          <Layers className="size-4 shrink-0 text-white/40" />
                          <span className="min-w-0 flex-1 truncate text-white/90">{p.region || p.id}</span>
                          <button type="button" onClick={() => fitPack(p)} aria-label={`Zoom to ${p.region || "pack"}`} className="shrink-0 text-white/50 hover:text-white"><Maximize className="size-4" /></button>
                          <button type="button" onClick={() => unregisterPack(p.id)} aria-label={`Remove ${p.region || "pack"}`} className="shrink-0 text-white/50 hover:text-destructive"><Trash2 className="size-4" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="space-y-2">
                    <input value={packFile} onChange={(e) => setPackFile(e.target.value)} placeholder="filename.pmtiles" aria-label="Pack filename" className="w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30" />
                    <input value={packName} onChange={(e) => setPackName(e.target.value)} placeholder="Label (optional, e.g. Berlin)" aria-label="Pack label" className="w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30" />
                    <Button size="sm" className="w-full" onClick={registerPack} disabled={!packFile.trim()}><Plus className="size-4" /> Register pack</Button>
                    {packErr && <p role="alert" className="text-[11px] text-destructive">{packErr}</p>}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1.5 bg-border transition-colors hover:bg-primary/50 data-[resize-handle-state=drag]:bg-primary" />

        {/* Map fills the remainder. */}
        <Panel order={2} onResize={resizeMap} className="relative min-w-0">
          <div ref={ref} className="h-full w-full" />
          {panelCollapsed && (
            <button type="button" onClick={togglePanel} aria-label="Open panel" className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/80 px-2.5 py-1.5 text-xs text-white backdrop-blur transition-colors hover:bg-black/90">
              <PanelLeftOpen className="size-4" /> Panel
            </button>
          )}
          <div className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/60 backdrop-blur">© OpenStreetMap</div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

function LayerRow({ icon: Icon, color, label, on, onToggle, note }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; label: string; on: boolean; onToggle: (v: boolean) => void; note?: string;
}) {
  return (
    <div className="py-1">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm">
          <Icon className="size-4" style={{ color }} />
          {label}
        </span>
        <Switch checked={on} onCheckedChange={onToggle} aria-label={`Toggle ${label}`} />
      </div>
      {note === "off" && (
        <Link href="/settings" className="ml-6 block text-[11px] text-white/45 hover:text-white/70">Off — enable connection in Settings →</Link>
      )}
      {note === "zoom" && <span className="ml-6 block text-[11px] text-white/45">Zoom in to load cameras</span>}
      {note === "err" && <span className="ml-6 block text-[11px] text-white/45">Couldn&apos;t load right now</span>}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
function planeEl(a: Aircraft) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "width:18px;height:18px;display:grid;place-items:center;cursor:pointer";
  const g = document.createElement("div");
  g.textContent = "✈";
  const hot = (a.alt_baro ?? 0) < 8000;
  g.style.cssText = `font-size:15px;line-height:1;color:${hot ? "#e0b24a" : "#7fb2ff"};transform:rotate(${a.track ?? 0}deg);transition:transform .3s ease;text-shadow:0 0 4px rgba(0,0,0,.7)`;
  wrap.appendChild(g);
  return wrap;
}
function planePopup(a: Aircraft) {
  const rows: [string, string][] = [
    ["Type", a.type || "—"],
    ["Altitude", a.alt_baro != null ? `${a.alt_baro.toLocaleString()} ft` : "—"],
    ["Speed", a.gs != null ? `${Math.round(a.gs)} kt` : "—"],
    ["Heading", a.track != null ? `${Math.round(a.track)}°` : "—"],
  ];
  return `<div style="min-width:150px;font-family:system-ui">
    <div style="font:600 13px system-ui;margin-bottom:4px">✈ ${escapeHtml(a.flight?.trim() || a.hex)}</div>
    ${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;color:#888"><span>${k}</span><span style="font-family:ui-monospace;color:#222">${escapeHtml(v)}</span></div>`).join("")}
  </div>`;
}
function disasterEl(d: Disaster) {
  const color = ALERT_COLOR[d.properties.alertlevel ?? "Green"] ?? "#e0992a";
  const el = document.createElement("div");
  el.textContent = DISASTER_GLYPH[d.properties.eventtype] ?? "⚠";
  el.style.cssText = `font-size:16px;line-height:1;cursor:pointer;filter:drop-shadow(0 0 3px ${color});color:${color};text-shadow:0 0 4px rgba(0,0,0,.8)`;
  return el;
}
function disasterPopup(d: Disaster): string {
  const p = d.properties;
  const TYPE: Record<string, string> = { EQ: "Earthquake", TC: "Tropical cyclone", FL: "Flood", VO: "Volcano", WF: "Wildfire", DR: "Drought" };
  // Strip tags to a stable fixpoint (a single pass is bypassable, e.g.
  // "<scr<i>ipt>"); the result is also escapeHtml'd below for defence in depth.
  let stripped = p.htmldescription || "";
  let prevStripped: string;
  do {
    prevStripped = stripped;
    stripped = stripped.replace(/<[^>]*>/g, "");
  } while (stripped !== prevStripped);
  const desc = stripped.trim().slice(0, 220);
  const link = p.url?.report;
  return `<div style="min-width:170px;max-width:240px;font-family:system-ui">
    <div style="font:600 13px system-ui;margin-bottom:3px">${escapeHtml(p.name || TYPE[p.eventtype] || "Event")}</div>
    <div style="font-size:11px;color:#888;margin-bottom:4px">${escapeHtml(TYPE[p.eventtype] ?? p.eventtype)} · ${escapeHtml(p.alertlevel ?? "—")} alert</div>
    ${desc ? `<div style="font-size:11px;color:#444;line-height:1.4">${escapeHtml(desc)}</div>` : ""}
    ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" style="display:block;margin-top:5px;font-size:11px;color:#2a6">GDACS report →</a>` : ""}
  </div>`;
}
function cameraPopup(cam: Camera, kind: CameraKind): string {
  const tags = (cam.tags ?? {}) as Record<string, string>;
  const label = (k: string) => tags[k];
  const heading =
    kind === "alpr"
      ? "🚗 ALPR plate-reader"
      : `📹 ${escapeHtml(label("surveillance:type") || label("camera:type") || "Camera")} surveillance`;
  const rows: [string, string | undefined][] = [
    ["Type", label("camera:type")],
    ["Mount", label("camera:mount")],
    ["Zone", label("surveillance:zone") || label("surveillance")],
    ["Direction", label("camera:direction") || label("direction")],
    ["Operator", label("operator")],
    ["Coverage", kind === "dome" ? "360° (dome)" : undefined],
  ].filter((r) => r[1]) as [string, string][];
  return `<div style="min-width:160px;font-family:system-ui">
    <div style="font:600 13px system-ui;text-transform:capitalize;margin-bottom:4px">${heading}</div>
    ${kind === "alpr" ? '<div style="font-size:11px;color:#b04030;margin-bottom:4px">Reads & logs your licence plate, time, and location.</div>' : ""}
    ${rows.length ? rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;color:#888"><span>${k}</span><span style="color:#222;text-transform:capitalize">${escapeHtml(v ?? "")}</span></div>`).join("") : '<div style="font-size:11px;color:#888">No further details tagged in OpenStreetMap.</div>'}
    <div style="margin-top:5px;font-size:10px;color:#aaa">© OpenStreetMap</div>
  </div>`;
}
function conflictPopup(e: ConflictEvent): string {
  const TOV: Record<number, string> = { 1: "State-based", 2: "Non-state", 3: "One-sided violence" };
  const deaths = Number(e.deaths) || 0;
  return `<div style="min-width:170px;max-width:240px;font-family:system-ui">
    <div style="font:600 13px system-ui;margin-bottom:3px">${escapeHtml(e.conflict_name || "Armed conflict")}</div>
    <div style="font-size:11px;color:#888;margin-bottom:4px">${escapeHtml(TOV[e.type_of_violence] || "Conflict")} · ${escapeHtml(String(e.year ?? ""))}</div>
    <div style="font-size:12px;color:#b04030;font-weight:600">${deaths.toLocaleString()} ${deaths === 1 ? "death" : "deaths"} <span style="font-weight:400;color:#999">(UCDP best estimate)</span></div>
    <div style="font-size:11px;color:#888;margin-top:3px">${escapeHtml(e.country || "")}${e.date_start ? ` · ${escapeHtml(String(e.date_start))}` : ""}</div>
    <div style="margin-top:5px;font-size:10px;color:#aaa">© UCDP GED (CC BY)</div>
  </div>`;
}
function nwsPopup(p: NwsAlert["properties"]): string {
  const color = NWS_SEVERITY_COLOR[p.severity] ?? "#9aa39c";
  return `<div style="min-width:180px;max-width:260px;font-family:system-ui">
    <div style="font:600 13px system-ui;margin-bottom:3px">${escapeHtml(p.event || "Weather alert")}</div>
    <div style="font-size:11px;margin-bottom:4px"><span style="color:${color};font-weight:600">${escapeHtml(p.severity || "Unknown")}</span><span style="color:#888"> · ${escapeHtml(p.areaDesc || "")}</span></div>
    ${p.headline ? `<div style="font-size:11px;color:#444;line-height:1.4">${escapeHtml(p.headline)}</div>` : ""}
    <div style="margin-top:5px;font-size:10px;color:#aaa">© NOAA / US National Weather Service</div>
  </div>`;
}
function firePopup(f: FirePoint): string {
  const conf: Record<string, string> = { l: "low", n: "nominal", h: "high" };
  const frp = Number(f.frp) || 0;
  return `<div style="min-width:150px;font-family:system-ui">
    <div style="font:600 13px system-ui;margin-bottom:3px">🔥 Active fire</div>
    <div style="font-size:11px;color:#888">FRP <span style="color:#222;font-family:ui-monospace">${frp.toFixed(1)} MW</span> · confidence ${escapeHtml(conf[f.confidence] ?? f.confidence ?? "—")}</div>
    <div style="font-size:11px;color:#888">${escapeHtml(String(f.acq_date ?? ""))} ${escapeHtml(String(f.acq_time ?? ""))} UTC · ${f.daynight === "N" ? "night" : "day"}</div>
    <div style="margin-top:5px;font-size:10px;color:#aaa">© NASA FIRMS (VIIRS)</div>
  </div>`;
}
function airPopup(s: AirStation): string {
  const params = (s.parameters ?? []).map((p) => p.toUpperCase()).slice(0, 8).join(", ");
  return `<div style="min-width:160px;font-family:system-ui">
    <div style="font:600 13px system-ui;margin-bottom:3px">${escapeHtml(s.name || "Monitoring station")}</div>
    <div style="font-size:11px;color:#888;margin-bottom:4px">${escapeHtml([s.locality, s.country].filter(Boolean).join(", "))}</div>
    ${params ? `<div style="font-size:11px;color:#444">Measures: ${escapeHtml(params)}</div>` : ""}
    <div style="margin-top:5px;font-size:10px;color:#aaa">© OpenAQ</div>
  </div>`;
}
function boundsRadiusNm(map: maplibregl.Map): number {
  const b = map.getBounds();
  const c = map.getCenter();
  const dLat = (b.getNorth() - c.lat) * 60;
  const dLng = (b.getEast() - c.lng) * 60 * Math.cos((c.lat * Math.PI) / 180);
  return Math.max(40, Math.sqrt(dLat * dLat + dLng * dLng));
}
