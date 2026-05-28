"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Plane, Activity, Cctv, MapPin, Plus, X, Satellite, CloudRain, TriangleAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export type MapMarker = { id: string; type: "destination" | "rally" | "sighting"; lat: number; lng: number; label: string };
type Marker = MapMarker;
type Aircraft = { hex: string; flight?: string; lat?: number; lon?: number; alt_baro?: number; gs?: number; track?: number; type?: string };
type Quake = { properties: { mag: number; place: string; url: string; tsunami: number }; geometry: { coordinates: [number, number, number] } };
type Camera = { lat: number; lon: number } & Record<string, unknown>;
type Disaster = { geometry: { coordinates: [number, number] }; properties: { eventtype: string; name: string; htmldescription: string; alertlevel?: string; url?: { report?: string } } };

const DISASTER_GLYPH: Record<string, string> = { EQ: "⊙", TC: "🌀", FL: "🌊", VO: "🌋", WF: "🔥", DR: "☀" };
const ALERT_COLOR: Record<string, string> = { Red: "#e06a5a", Orange: "#e0992a", Green: "#74b277" };

const MARKER_COLOR: Record<Marker["type"], string> = {
  destination: "#74b277",
  rally: "#74b277",
  sighting: "#e06a5a",
};

// Premium dark basemap with full detail (roads, cities, labels) from CARTO's
// free, no-key dark tiles (OSM-derived). The OSINT map is inherently online, so
// real tiles are appropriate here; falls back to a dark fill if tiles fail.
function darkStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
          "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors © CARTO",
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#0c0f0e" } },
      { id: "basemap", type: "raster", source: "basemap" },
    ],
  };
}

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

export function MapView({ markers }: { markers: Marker[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const layerMarkers = useRef<Record<string, maplibregl.Marker[]>>({ base: [], cameras: [], quakes: [], disasters: [], custom: [] });
  const planes = useRef<Map<string, { tlng: number; tlat: number; lng: number; lat: number; marker: maplibregl.Marker; el: HTMLDivElement }>>(new Map());
  const trails = useRef<Map<string, [number, number][]>>(new Map());
  const rafRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [layers, setLayers] = useState({ base: true, cameras: false, aircraft: false, quakes: false, disasters: false });
  const [satellite, setSatellite] = useState(false);
  const [radar, setRadar] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);

  function toggleSatellite(on: boolean) {
    setSatellite(on);
    mapRef.current?.setLayoutProperty("satellite", "visibility", on ? "visible" : "none");
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
    const map = new maplibregl.Map({
      container: ref.current,
      style: darkStyle(),
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
  async function setLayer(key: "cameras" | "aircraft" | "quakes" | "disasters", on: boolean) {
    setLayers((s) => ({ ...s, [key]: on }));
    const apiId = key === "cameras" ? "overpass" : key === "aircraft" ? "adsb" : key === "quakes" ? "usgs" : "gdacs";
    await fetch("/api/toggles", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_id: apiId, enabled: on }),
    }).catch(() => {});
    if (on) refreshLayer(key);
    else clearLayer(key);
  }

  function clearLayer(key: "cameras" | "aircraft" | "quakes" | "disasters") {
    const map = mapRef.current;
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
    }
    setNotes((n) => ({ ...n, [key]: "" }));
  }

  function refreshLayer(key: "cameras" | "aircraft" | "quakes" | "disasters") {
    if (key === "aircraft") {
      fetchAircraft();
      if (!pollRef.current) pollRef.current = setInterval(fetchAircraft, 20_000);
    } else if (key === "cameras") fetchCameras();
    else if (key === "disasters") fetchDisasters();
    else fetchQuakes();
  }

  async function fetchAircraft() {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const r = Math.min(250, Math.round(boundsRadiusNm(map)));
    const res = await fetch(`/api/map/aircraft?lat=${c.lat.toFixed(3)}&lon=${c.lng.toFixed(3)}&dist=${r}`);
    if (res.status === 503) { setNotes((n) => ({ ...n, aircraft: "off" })); return; }
    setNotes((n) => ({ ...n, aircraft: "" }));
    const { aircraft } = (await res.json()) as { aircraft: Aircraft[] };
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
    // Surveillance cameras are sparse; a world-size bbox times out on Overpass.
    if (map.getZoom() < 8) {
      layerMarkers.current.cameras.forEach((m) => m.remove());
      layerMarkers.current.cameras = [];
      setNotes((n) => ({ ...n, cameras: "zoom" }));
      return;
    }
    const b = map.getBounds();
    const res = await fetch(`/api/map/pois?south=${b.getSouth()}&west=${b.getWest()}&north=${b.getNorth()}&east=${b.getEast()}`);
    if (res.status === 503) { setNotes((n) => ({ ...n, cameras: "off" })); return; }
    setNotes((n) => ({ ...n, cameras: "" }));
    const { cameras } = (await res.json()) as { cameras: Camera[] };
    layerMarkers.current.cameras?.forEach((m) => m.remove());
    layerMarkers.current.cameras = [];
    for (const cam of (cameras ?? []).slice(0, 400)) {
      if (cam.lat == null || cam.lon == null) continue;
      const mk = new maplibregl.Marker({ element: dot("#e0b24a", 10) })
        .setLngLat([cam.lon, cam.lat])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(cameraPopup(cam)))
        .addTo(map);
      layerMarkers.current.cameras.push(mk);
    }
  }

  // refetch viewport-bound layers on pan/zoom
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const onMove = () => { if (layers.aircraft) fetchAircraft(); if (layers.cameras) fetchCameras(); };
    map.on("moveend", onMove);
    return () => { map.off("moveend", onMove); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, layers.aircraft, layers.cameras]);

  // ---- custom point placement ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const onClick = async (e: maplibregl.MapMouseEvent) => {
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
    map.getCanvas().style.cursor = placing ? "crosshair" : "";
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setPlacing(false); };
    window.addEventListener("keydown", onKey);
    return () => { map.off("click", onClick); window.removeEventListener("keydown", onKey); };
  }, [placing, ready]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      <div ref={ref} className="h-[72vh] w-full" />

      <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-xs text-white/80 backdrop-blur">
        Toggle live OSINT layers at right. Use <span className="text-white">Add a point</span> then click the map to drop your own marker. Data is fetched only when a layer is on. © OpenStreetMap
      </div>

      <div className="absolute right-3 top-3 w-60 rounded-xl border border-white/10 bg-black/80 p-3 text-white shadow-lg backdrop-blur">
        <p className="label-caps mb-2 text-white/50">Basemap</p>
        <LayerRow icon={Satellite} color="#9fd3ff" label="Satellite imagery" on={satellite} onToggle={toggleSatellite} />
        <LayerRow icon={CloudRain} color="#7fb2ff" label="Weather radar" on={radar} onToggle={toggleRadar} note={notes.radar} />
        <p className="label-caps mb-2 mt-3 text-white/50">Layers</p>
        <LayerRow icon={MapPin} color="#74b277" label="Your points" on={layers.base} onToggle={(v) => setLayers((s) => ({ ...s, base: v }))} />
        <LayerRow icon={Plane} color="#7fb2ff" label="Live aircraft" on={layers.aircraft} onToggle={(v) => setLayer("aircraft", v)} note={notes.aircraft} />
        <LayerRow icon={Activity} color="#e06a5a" label="Earthquakes" on={layers.quakes} onToggle={(v) => setLayer("quakes", v)} note={notes.quakes} />
        <LayerRow icon={TriangleAlert} color="#e0992a" label="Disasters (GDACS)" on={layers.disasters} onToggle={(v) => setLayer("disasters", v)} note={notes.disasters} />
        <LayerRow icon={Cctv} color="#e0b24a" label="Cameras (nearby)" on={layers.cameras} onToggle={(v) => setLayer("cameras", v)} note={notes.cameras} />
        <Button size="sm" variant={placing ? "default" : "outline"} className="mt-3 w-full" onClick={() => setPlacing((p) => !p)}>
          {placing ? <><X className="size-4" /> Cancel</> : <><Plus className="size-4" /> Add a point</>}
        </Button>
      </div>
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
  const desc = (p.htmldescription || "").replace(/<[^>]*>/g, "").trim().slice(0, 220);
  const link = p.url?.report;
  return `<div style="min-width:170px;max-width:240px;font-family:system-ui">
    <div style="font:600 13px system-ui;margin-bottom:3px">${escapeHtml(p.name || TYPE[p.eventtype] || "Event")}</div>
    <div style="font-size:11px;color:#888;margin-bottom:4px">${escapeHtml(TYPE[p.eventtype] ?? p.eventtype)} · ${escapeHtml(p.alertlevel ?? "—")} alert</div>
    ${desc ? `<div style="font-size:11px;color:#444;line-height:1.4">${escapeHtml(desc)}</div>` : ""}
    ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" style="display:block;margin-top:5px;font-size:11px;color:#2a6">GDACS report →</a>` : ""}
  </div>`;
}
function cameraPopup(cam: Camera): string {
  const tags = (cam.tags ?? {}) as Record<string, string>;
  const label = (k: string) => tags[k];
  const kind = label("surveillance:type") || label("camera:type") || "Camera";
  const rows: [string, string | undefined][] = [
    ["Type", label("camera:type")],
    ["Mount", label("camera:mount")],
    ["Zone", label("surveillance:zone") || label("surveillance")],
    ["Direction", label("camera:direction") || label("direction")],
    ["Operator", label("operator")],
    ["Coverage", label("camera:type") === "dome" ? "360° (dome)" : undefined],
  ].filter((r) => r[1]) as [string, string][];
  return `<div style="min-width:160px;font-family:system-ui">
    <div style="font:600 13px system-ui;text-transform:capitalize;margin-bottom:4px">📹 ${escapeHtml(kind)} surveillance</div>
    ${rows.length ? rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;color:#888"><span>${k}</span><span style="color:#222;text-transform:capitalize">${escapeHtml(v ?? "")}</span></div>`).join("") : '<div style="font-size:11px;color:#888">No further details tagged in OpenStreetMap.</div>'}
    <div style="margin-top:5px;font-size:10px;color:#aaa">© OpenStreetMap</div>
  </div>`;
}
function boundsRadiusNm(map: maplibregl.Map): number {
  const b = map.getBounds();
  const c = map.getCenter();
  const dLat = (b.getNorth() - c.lat) * 60;
  const dLng = (b.getEast() - c.lng) * 60 * Math.cos((c.lat * Math.PI) / 180);
  return Math.max(40, Math.sqrt(dLat * dLat + dLng * dLng));
}
