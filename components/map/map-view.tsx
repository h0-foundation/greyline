"use client";

import * as React from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { Loader2, MapPin, Plus } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type MarkerType = "destination" | "rally" | "sighting";

export type MapMarker = {
  id: string;
  type: MarkerType;
  lat: number;
  lng: number;
  label: string;
};

/* ---- API response shapes ---- */

type CameraPoi = { lat: number; lon: number } & Record<string, unknown>;
type PoiResponse =
  | { ok: true; cameras: CameraPoi[] }
  | { ok: false; disabled?: true; error?: string };

type Aircraft = {
  hex: string;
  flight?: string;
  lat: number;
  lon: number;
  alt_baro?: number;
  gs?: number;
  track?: number;
  squawk?: string;
  type?: string;
};
type AircraftResponse =
  | { ok: true; aircraft: Aircraft[] }
  | { ok: false; disabled?: true; error?: string };

type QuakeFeature = {
  type: "Feature";
  properties: { mag: number; place: string; time: number; url: string; tsunami: number };
  geometry: { type: "Point"; coordinates: [number, number, number] };
};
type QuakeResponse =
  | { ok: true; quakes: QuakeFeature[] }
  | { ok: false; disabled?: true; error?: string };

/* ---- module-scope PMTiles registration ---- */

let pmtilesRegistered = false;
function ensurePmtilesProtocol() {
  if (pmtilesRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesRegistered = true;
}

/* ---- visual tokens ---- */

const MARKER_STYLES: Record<MarkerType, { color: string; ring: string; label: string }> = {
  destination: { color: "var(--color-primary, #2563eb)", ring: "rgba(37,99,235,0.35)", label: "Destination" },
  rally: { color: "var(--color-success, #16a34a)", ring: "rgba(22,163,74,0.35)", label: "Rally point" },
  sighting: { color: "var(--color-destructive, #dc2626)", ring: "rgba(220,38,38,0.35)", label: "Sighting" },
};

const CAMERA_COLOR = "#f59e0b";
const AIRCRAFT_COLOR = "#0ea5e9";
const QUAKE_FAINT = "var(--color-faint, #9ca3af)";
const QUAKE_WARN = "var(--color-warning, #f59e0b)";
const QUAKE_BAD = "var(--color-destructive, #dc2626)";

/* ---- DOM helpers ---- */

function makeDot(color: string, ring: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "14px";
  el.style.height = "14px";
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.border = "2px solid white";
  el.style.boxShadow = `0 0 0 4px ${ring}`;
  el.style.cursor = "pointer";
  return el;
}

function makePlane(track: number | undefined): HTMLDivElement {
  const el = document.createElement("div");
  el.textContent = "✈"; // airplane glyph
  el.style.fontSize = "18px";
  el.style.lineHeight = "1";
  el.style.color = AIRCRAFT_COLOR;
  el.style.cursor = "pointer";
  el.style.textShadow = "0 0 3px white, 0 0 3px white";
  // The glyph points NE (~45deg); offset so 0deg track ≈ north.
  const rot = typeof track === "number" ? track - 45 : -45;
  el.style.transform = `rotate(${rot}deg)`;
  el.style.transformOrigin = "center";
  return el;
}

function makeQuakeDot(mag: number): { el: HTMLDivElement; color: string } {
  const color = mag >= 5 ? QUAKE_BAD : mag >= 3 ? QUAKE_WARN : QUAKE_FAINT;
  const size = Math.max(10, Math.min(40, 6 + mag * 5));
  const el = document.createElement("div");
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.opacity = "0.55";
  el.style.border = "1px solid white";
  el.style.cursor = "pointer";
  return { el, color };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

function popupHtml(title: string, sub?: string): string {
  return (
    `<div style="font-size:12px;font-weight:500">${escapeHtml(title)}</div>` +
    (sub ? `<div style="font-size:11px;opacity:0.6">${escapeHtml(sub)}</div>` : "")
  );
}

function cameraName(c: CameraPoi): string {
  const name = c["name"];
  if (typeof name === "string" && name.trim()) return name.trim();
  return "Surveillance camera";
}

// Approximate viewport radius (NM) from map bounds: half the diagonal.
function viewportRadiusNm(map: maplibregl.Map): number {
  const b = map.getBounds();
  const ne = b.getNorthEast();
  const sw = b.getSouthWest();
  const dLat = (ne.lat - sw.lat) * 60; // 1deg lat ≈ 60 NM
  const meanLat = ((ne.lat + sw.lat) / 2) * (Math.PI / 180);
  const dLon = (ne.lng - sw.lng) * 60 * Math.cos(meanLat);
  const diag = Math.sqrt(dLat * dLat + dLon * dLon);
  return Math.max(10, Math.min(250, Math.round(diag / 2)));
}

const OFF_NOTE = "Off — enable in Settings";

type LayerKey = "points" | "cameras" | "aircraft" | "quakes";

export function MapView({ markers }: { markers: MapMarker[] }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);

  // Per-layer marker collections.
  const baseMarkersRef = React.useRef<maplibregl.Marker[]>([]);
  const cameraMarkersRef = React.useRef<maplibregl.Marker[]>([]);
  const aircraftMarkersRef = React.useRef<maplibregl.Marker[]>([]);
  const quakeMarkersRef = React.useRef<maplibregl.Marker[]>([]);
  const customMarkersRef = React.useRef<maplibregl.Marker[]>([]);

  const aircraftTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const placingRef = React.useRef(false);

  const [pointsOn, setPointsOn] = React.useState(true);
  const [camerasOn, setCamerasOn] = React.useState(false);
  const [aircraftOn, setAircraftOn] = React.useState(false);
  const [quakesOn, setQuakesOn] = React.useState(false);

  const [loading, setLoading] = React.useState<Record<LayerKey, boolean>>({
    points: false,
    cameras: false,
    aircraft: false,
    quakes: false,
  });
  const [notes, setNotes] = React.useState<Record<LayerKey, string | null>>({
    points: null,
    cameras: null,
    aircraft: null,
    quakes: null,
  });
  const [offLayers, setOffLayers] = React.useState<Record<LayerKey, boolean>>({
    points: false,
    cameras: false,
    aircraft: false,
    quakes: false,
  });

  const [placing, setPlacing] = React.useState(false);

  const setLoadingFor = React.useCallback((k: LayerKey, v: boolean) => {
    setLoading((s) => ({ ...s, [k]: v }));
  }, []);
  const setNoteFor = React.useCallback((k: LayerKey, v: string | null) => {
    setNotes((s) => ({ ...s, [k]: v }));
  }, []);
  const setOffFor = React.useCallback((k: LayerKey, v: boolean) => {
    setOffLayers((s) => ({ ...s, [k]: v }));
  }, []);

  const clearRef = React.useCallback((ref: React.RefObject<maplibregl.Marker[]>) => {
    ref.current.forEach((mk) => mk.remove());
    ref.current = [];
  }, []);

  /* ---- base markers (the `markers` prop) ---- */

  const drawBaseMarkers = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    clearRef(baseMarkersRef);
    for (const m of markers) {
      const style = MARKER_STYLES[m.type];
      const popup = new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
        popupHtml(m.label, style.label),
      );
      const mk = new maplibregl.Marker({ element: makeDot(style.color, style.ring) })
        .setLngLat([m.lng, m.lat])
        .setPopup(popup)
        .addTo(map);
      baseMarkersRef.current.push(mk);
    }
  }, [markers, clearRef]);

  /* ---- cameras ---- */

  const loadCameras = React.useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    setLoadingFor("cameras", true);
    setNoteFor("cameras", null);
    clearRef(cameraMarkersRef);
    try {
      const b = map.getBounds();
      const params = new URLSearchParams({
        south: String(b.getSouth()),
        west: String(b.getWest()),
        north: String(b.getNorth()),
        east: String(b.getEast()),
      });
      const res = await fetch(`/api/map/pois?${params.toString()}`);
      if (res.status === 503) {
        setOffFor("cameras", true);
        return;
      }
      const data = (await res.json()) as PoiResponse;
      if (!data.ok) {
        if (data.disabled) setOffFor("cameras", true);
        else setNoteFor("cameras", "Failed to load cameras");
        return;
      }
      setOffFor("cameras", false);
      for (const c of data.cameras) {
        const popup = new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
          popupHtml(cameraName(c)),
        );
        const mk = new maplibregl.Marker({ element: makeDot(CAMERA_COLOR, "rgba(245,158,11,0.35)") })
          .setLngLat([c.lon, c.lat])
          .setPopup(popup)
          .addTo(map);
        cameraMarkersRef.current.push(mk);
      }
      if (data.cameras.length === 0) setNoteFor("cameras", "No cameras in this view");
    } catch {
      setNoteFor("cameras", "Failed to load cameras");
    } finally {
      setLoadingFor("cameras", false);
    }
  }, [clearRef, setLoadingFor, setNoteFor, setOffFor]);

  /* ---- aircraft ---- */

  const loadAircraft = React.useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    setLoadingFor("aircraft", true);
    setNoteFor("aircraft", null);
    try {
      const c = map.getCenter();
      const dist = viewportRadiusNm(map);
      const params = new URLSearchParams({
        lat: String(c.lat),
        lon: String(c.lng),
        dist: String(dist),
      });
      const res = await fetch(`/api/map/aircraft?${params.toString()}`);
      if (res.status === 503) {
        setOffFor("aircraft", true);
        clearRef(aircraftMarkersRef);
        return;
      }
      const data = (await res.json()) as AircraftResponse;
      if (!data.ok) {
        if (data.disabled) setOffFor("aircraft", true);
        else setNoteFor("aircraft", "Failed to load aircraft");
        return;
      }
      setOffFor("aircraft", false);
      clearRef(aircraftMarkersRef);
      const visible = data.aircraft.filter(
        (a) => typeof a.lat === "number" && typeof a.lon === "number",
      );
      for (const a of visible) {
        const sub = [
          a.alt_baro != null ? `${a.alt_baro} ft` : null,
          a.gs != null ? `${Math.round(a.gs)} kt` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
          popupHtml((a.flight || a.hex).trim(), sub || undefined),
        );
        const mk = new maplibregl.Marker({ element: makePlane(a.track) })
          .setLngLat([a.lon, a.lat])
          .setPopup(popup)
          .addTo(map);
        aircraftMarkersRef.current.push(mk);
      }
      if (visible.length === 0) setNoteFor("aircraft", "No aircraft in this view");
    } catch {
      setNoteFor("aircraft", "Failed to load aircraft");
    } finally {
      setLoadingFor("aircraft", false);
    }
  }, [clearRef, setLoadingFor, setNoteFor, setOffFor]);

  /* ---- earthquakes ---- */

  const loadQuakes = React.useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    setLoadingFor("quakes", true);
    setNoteFor("quakes", null);
    clearRef(quakeMarkersRef);
    try {
      const res = await fetch(`/api/map/earthquakes`);
      if (res.status === 503) {
        setOffFor("quakes", true);
        return;
      }
      const data = (await res.json()) as QuakeResponse;
      if (!data.ok) {
        if (data.disabled) setOffFor("quakes", true);
        else setNoteFor("quakes", "Failed to load earthquakes");
        return;
      }
      setOffFor("quakes", false);
      for (const q of data.quakes) {
        const [lon, lat] = q.geometry.coordinates;
        if (typeof lon !== "number" || typeof lat !== "number") continue;
        const mag = q.properties.mag ?? 0;
        const { el } = makeQuakeDot(mag);
        const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
          popupHtml(q.properties.place || "Earthquake", `M${mag.toFixed(1)}`),
        );
        const mk = new maplibregl.Marker({ element: el })
          .setLngLat([lon, lat])
          .setPopup(popup)
          .addTo(map);
        quakeMarkersRef.current.push(mk);
      }
      if (data.quakes.length === 0) setNoteFor("quakes", "No recent earthquakes");
    } catch {
      setNoteFor("quakes", "Failed to load earthquakes");
    } finally {
      setLoadingFor("quakes", false);
    }
  }, [clearRef, setLoadingFor, setNoteFor, setOffFor]);

  /* ---- map init ---- */

  React.useEffect(() => {
    if (!containerRef.current) return;
    ensurePmtilesProtocol();

    const first = markers[0];
    const center: [number, number] = first ? [first.lng, first.lat] : [0, 20];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center,
      zoom: first ? 6 : 1.5,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("error", (e) => {
      // eslint-disable-next-line no-console
      console.warn("MapLibre error:", e.error?.message ?? e);
    });

    map.on("load", () => {
      drawBaseMarkers();
    });

    if (markers.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      for (const m of markers) bounds.extend([m.lng, m.lat]);
      map.fitBounds(bounds, { padding: 64, maxZoom: 10, duration: 0 });
    }

    return () => {
      if (aircraftTimerRef.current) {
        clearInterval(aircraftTimerRef.current);
        aircraftTimerRef.current = null;
      }
      [
        baseMarkersRef,
        cameraMarkersRef,
        aircraftMarkersRef,
        quakeMarkersRef,
        customMarkersRef,
      ].forEach((ref) => {
        ref.current.forEach((mk) => mk.remove());
        ref.current = [];
      });
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  /* ---- toggle base points ---- */

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pointsOn) {
      if (map.loaded()) drawBaseMarkers();
    } else {
      clearRef(baseMarkersRef);
    }
  }, [pointsOn, drawBaseMarkers, clearRef]);

  /* ---- bounds-driven refetch for cameras + aircraft ---- */

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onMoveEnd = () => {
      if (camerasOn) void loadCameras();
      if (aircraftOn) void loadAircraft();
    };
    map.on("moveend", onMoveEnd);
    return () => {
      map.off("moveend", onMoveEnd);
    };
  }, [camerasOn, aircraftOn, loadCameras, loadAircraft]);

  /* ---- aircraft 30s poll ---- */

  React.useEffect(() => {
    if (!aircraftOn) {
      if (aircraftTimerRef.current) {
        clearInterval(aircraftTimerRef.current);
        aircraftTimerRef.current = null;
      }
      return;
    }
    aircraftTimerRef.current = setInterval(() => {
      void loadAircraft();
    }, 30_000);
    return () => {
      if (aircraftTimerRef.current) {
        clearInterval(aircraftTimerRef.current);
        aircraftTimerRef.current = null;
      }
    };
  }, [aircraftOn, loadAircraft]);

  /* ---- toggle handlers ---- */

  const toggleCameras = React.useCallback(
    (on: boolean) => {
      setCamerasOn(on);
      setNoteFor("cameras", null);
      if (on) void loadCameras();
      else clearRef(cameraMarkersRef);
    },
    [loadCameras, clearRef, setNoteFor],
  );

  const toggleAircraft = React.useCallback(
    (on: boolean) => {
      setAircraftOn(on);
      setNoteFor("aircraft", null);
      if (on) void loadAircraft();
      else clearRef(aircraftMarkersRef);
    },
    [loadAircraft, clearRef, setNoteFor],
  );

  const toggleQuakes = React.useCallback(
    (on: boolean) => {
      setQuakesOn(on);
      setNoteFor("quakes", null);
      if (on) void loadQuakes();
      else clearRef(quakeMarkersRef);
    },
    [loadQuakes, clearRef, setNoteFor],
  );

  /* ---- add-your-own point (placing mode) ---- */

  const exitPlacing = React.useCallback(() => {
    placingRef.current = false;
    setPlacing(false);
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = "";
  }, []);

  const startPlacing = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    placingRef.current = true;
    setPlacing(true);
    map.getCanvas().style.cursor = "crosshair";
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onClick = async (e: maplibregl.MapMouseEvent) => {
      if (!placingRef.current) return;
      const { lng, lat } = e.lngLat;
      exitPlacing();
      const name = window.prompt("Name this point");
      if (!name || !name.trim()) return;
      try {
        const res = await fetch("/api/rally", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), lat, lng }),
        });
        const data = (await res.json()) as { ok?: boolean };
        if (!data.ok) return;
        const style = MARKER_STYLES.rally;
        const popup = new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
          popupHtml(name.trim(), style.label),
        );
        const mk = new maplibregl.Marker({ element: makeDot(style.color, style.ring) })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);
        customMarkersRef.current.push(mk);
      } catch {
        /* swallow — placing failed silently */
      }
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape" && placingRef.current) exitPlacing();
    };

    map.on("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      map.off("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [exitPlacing]);

  /* ---- layer panel rows ---- */

  const LAYER_ROWS: {
    key: LayerKey;
    label: string;
    color: string;
    checked: boolean;
    onToggle: (on: boolean) => void;
  }[] = [
    {
      key: "points",
      label: "Your points",
      color: MARKER_STYLES.destination.color,
      checked: pointsOn,
      onToggle: setPointsOn,
    },
    {
      key: "cameras",
      label: "Surveillance cameras",
      color: CAMERA_COLOR,
      checked: camerasOn,
      onToggle: toggleCameras,
    },
    {
      key: "aircraft",
      label: "Live aircraft",
      color: AIRCRAFT_COLOR,
      checked: aircraftOn,
      onToggle: toggleAircraft,
    },
    {
      key: "quakes",
      label: "Earthquakes",
      color: QUAKE_BAD,
      checked: quakesOn,
      onToggle: toggleQuakes,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border shadow-xs">
      <div ref={containerRef} className="h-[72vh] w-full bg-card" />

      {/* Instructions + attribution (top-left) */}
      <div className="pointer-events-none absolute left-3 top-3 max-w-[18rem] space-y-2">
        <div className="rounded-xl border border-border bg-card/90 p-2.5 text-xs leading-relaxed text-muted-foreground shadow-xs backdrop-blur">
          Toggle live OSINT layers at right · Click{" "}
          <span className="text-foreground">Add a point</span> then the map to drop your own
          marker · Data is fetched only when a layer is on.
        </div>
        <div className="rounded-xl border border-border bg-card/90 p-2.5 shadow-xs backdrop-blur">
          <div className="label-caps mb-1.5 text-faint">Legend</div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {(Object.keys(MARKER_STYLES) as MarkerType[]).map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ background: MARKER_STYLES[t].color }}
                />
                {MARKER_STYLES[t].label}
              </li>
            ))}
            <li className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full" style={{ background: CAMERA_COLOR }} />
              Surveillance camera
            </li>
            <li className="flex items-center gap-2">
              <span style={{ color: AIRCRAFT_COLOR }}>{"✈"}</span>
              Aircraft
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full" style={{ background: QUAKE_BAD }} />
              Earthquake
            </li>
          </ul>
          <div className="mt-2 text-[10px] text-faint">© OpenStreetMap contributors</div>
        </div>
      </div>

      {/* Layer control panel (top-right) */}
      <div className="absolute right-3 top-3 w-64 rounded-xl border border-border bg-card/95 p-3 shadow-xs backdrop-blur">
        <div className="label-caps mb-2 text-faint">Layers</div>
        <ul className="space-y-2.5">
          {LAYER_ROWS.map((row) => (
            <li key={row.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={`layer-${row.key}`}
                  className="flex min-w-0 cursor-pointer items-center gap-2 text-sm text-foreground"
                >
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ background: row.color }}
                  />
                  <span className="truncate">{row.label}</span>
                  {loading[row.key] && (
                    <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
                  )}
                </label>
                <Switch
                  id={`layer-${row.key}`}
                  checked={row.checked}
                  onCheckedChange={row.onToggle}
                />
              </div>
              {offLayers[row.key] && (
                <p className="pl-[18px] text-[11px] text-faint">
                  Off —{" "}
                  <Link href="/settings" className="text-primary hover:underline">
                    enable in Settings
                  </Link>
                </p>
              )}
              {!offLayers[row.key] && notes[row.key] && (
                <p className="pl-[18px] text-[11px] text-muted-foreground">{notes[row.key]}</p>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t border-border pt-3">
          <Button
            size="sm"
            variant={placing ? "default" : "outline"}
            className="w-full"
            onClick={placing ? exitPlacing : startPlacing}
          >
            {placing ? <MapPin /> : <Plus />}
            {placing ? "Cancel placing" : "Add a point"}
          </Button>
        </div>
      </div>

      {/* Placing hint banner */}
      {placing && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <Badge className="font-mono text-[11px]">
            Click the map to drop a point — Esc to cancel
          </Badge>
        </div>
      )}

      {markers.length === 0 && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-3 flex justify-center",
          )}
        >
          <span className="rounded-md border border-border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow-xs backdrop-blur">
            No points yet — toggle a layer at right or add your own.
          </span>
        </div>
      )}
    </div>
  );
}
