"use client";

import * as React from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { Camera, Loader2 } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";

export type MarkerType = "destination" | "rally" | "sighting";

export type MapMarker = {
  id: string;
  type: MarkerType;
  lat: number;
  lng: number;
  label: string;
};

type CameraPoi = { lat: number; lon: number; name?: string | null };

type PoiResponse =
  | { ok: true; cameras: CameraPoi[] }
  | { ok: false; disabled?: true; error?: string };

// Register the PMTiles protocol once for the whole module so a bundled basemap
// can be served via the "pmtiles://" scheme without re-registering per mount.
let pmtilesRegistered = false;
function ensurePmtilesProtocol() {
  if (pmtilesRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesRegistered = true;
}

const MARKER_STYLES: Record<MarkerType, { color: string; ring: string; label: string }> = {
  destination: { color: "var(--color-primary, #2563eb)", ring: "rgba(37,99,235,0.35)", label: "Destination" },
  rally: { color: "var(--color-success, #16a34a)", ring: "rgba(22,163,74,0.35)", label: "Rally point" },
  sighting: { color: "var(--color-destructive, #dc2626)", ring: "rgba(220,38,38,0.35)", label: "Sighting" },
};

const CAMERA_COLOR = "#f59e0b";

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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

export function MapView({ markers }: { markers: MapMarker[] }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const cameraMarkersRef = React.useRef<maplibregl.Marker[]>([]);

  const [poiOn, setPoiOn] = React.useState(false);
  const [poiLoading, setPoiLoading] = React.useState(false);
  const [poiNote, setPoiNote] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    ensurePmtilesProtocol();

    const first = markers[0];
    // Default to a world view; center on the first marker when available.
    const center: [number, number] = first ? [first.lng, first.lat] : [0, 20];

    // DEFAULT: the free MapLibre demo vector style (no API key required).
    // For full offline use, drop a basemap at /public/basemap.pmtiles and swap
    // `style` for a pmtiles source, e.g.:
    //   style: { version: 8, sources: { p: { type: "vector", url: "pmtiles:///basemap.pmtiles" } }, layers: [...] }
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center,
      zoom: first ? 6 : 1.5,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    // Keep the page alive even if the remote style fails to load.
    map.on("error", (e) => {
      // eslint-disable-next-line no-console
      console.warn("MapLibre error:", e.error?.message ?? e);
    });

    // Plot the data markers.
    for (const m of markers) {
      const style = MARKER_STYLES[m.type];
      const popup = new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
        `<div style="font-size:12px;font-weight:500">${escapeHtml(m.label)}</div>` +
          `<div style="font-size:11px;opacity:0.6">${style.label}</div>`,
      );
      new maplibregl.Marker({ element: makeDot(style.color, style.ring) })
        .setLngLat([m.lng, m.lat])
        .setPopup(popup)
        .addTo(map);
    }

    // Fit bounds to all markers when there is more than one.
    if (markers.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      for (const m of markers) bounds.extend([m.lng, m.lat]);
      map.fitBounds(bounds, { padding: 64, maxZoom: 10, duration: 0 });
    }

    return () => {
      cameraMarkersRef.current.forEach((mk) => mk.remove());
      cameraMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [markers]);

  const clearCameraMarkers = React.useCallback(() => {
    cameraMarkersRef.current.forEach((mk) => mk.remove());
    cameraMarkersRef.current = [];
  }, []);

  const loadCameras = React.useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    setPoiLoading(true);
    setPoiNote(null);
    clearCameraMarkers();
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
        setPoiNote("Connection off — enable Overpass in Settings");
        return;
      }
      const data = (await res.json()) as PoiResponse;
      if (!data.ok) {
        setPoiNote(data.disabled ? "Connection off — enable Overpass in Settings" : "Failed to load cameras");
        return;
      }
      for (const c of data.cameras) {
        const el = makeDot(CAMERA_COLOR, "rgba(245,158,11,0.35)");
        const popup = new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
          `<div style="font-size:12px;font-weight:500">${escapeHtml(c.name?.trim() || "Surveillance camera")}</div>`,
        );
        const mk = new maplibregl.Marker({ element: el })
          .setLngLat([c.lon, c.lat])
          .setPopup(popup)
          .addTo(map);
        cameraMarkersRef.current.push(mk);
      }
      if (data.cameras.length === 0) setPoiNote("No cameras found in this view");
    } catch {
      setPoiNote("Failed to load cameras");
    } finally {
      setPoiLoading(false);
    }
  }, [clearCameraMarkers]);

  const togglePoi = React.useCallback(() => {
    if (poiOn) {
      setPoiOn(false);
      setPoiNote(null);
      clearCameraMarkers();
    } else {
      setPoiOn(true);
      void loadCameras();
    }
  }, [poiOn, clearCameraMarkers, loadCameras]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border shadow-xs">
      <div ref={containerRef} className="h-[70vh] w-full bg-card" />

      {/* Legend */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-xl border border-border bg-card/90 p-3 text-xs shadow-xs backdrop-blur">
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-faint">Legend</div>
        <ul className="space-y-1">
          {(Object.keys(MARKER_STYLES) as MarkerType[]).map((t) => (
            <li key={t} className="flex items-center gap-2 text-muted-foreground">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ background: MARKER_STYLES[t].color }}
              />
              {MARKER_STYLES[t].label}
            </li>
          ))}
          <li className="flex items-center gap-2 text-muted-foreground">
            <span className="inline-block size-2.5 rounded-full" style={{ background: CAMERA_COLOR }} />
            Surveillance camera
          </li>
        </ul>
      </div>

      {/* POI toggle */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
        <Button
          size="sm"
          variant={poiOn ? "default" : "outline"}
          onClick={togglePoi}
          disabled={poiLoading}
        >
          {poiLoading ? <Loader2 className="animate-spin" /> : <Camera />}
          POI: surveillance cameras
        </Button>
        {poiNote && (
          <span className="max-w-[14rem] rounded-md border border-border bg-card/90 px-2 py-1 text-right text-[11px] text-muted-foreground shadow-xs backdrop-blur">
            {poiNote}
          </span>
        )}
      </div>

      {markers.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <span className="rounded-md border border-border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow-xs backdrop-blur">
            No destinations, rally points, or sightings to plot yet.
          </span>
        </div>
      )}
    </div>
  );
}
