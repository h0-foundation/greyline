"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Pencil, Undo2, Trash2, Save, Eye, EyeOff, Route as RouteIcon, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  routeMetrics,
  deviationLabel,
  formatDistance,
  ROUTE_TYPES,
  ROUTE_COLOR,
  type RouteType,
  type LngLat,
} from "@/lib/route-planning";

type SavedRoute = {
  id: string;
  type: string;
  name: string | null;
  waypoints: string;
  distance_m: number | null;
};

// Inlined dark raster style (same free CARTO tiles as the OSINT map) so this
// focused planner is fully independent of components/map/map-view.tsx.
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

function numDot(n: number) {
  const el = document.createElement("div");
  el.textContent = String(n);
  el.style.cssText =
    "width:18px;height:18px;border-radius:50%;background:#e0b24a;color:#1a1a1a;font:600 11px system-ui;display:grid;place-items:center;box-shadow:0 0 0 2px rgba(0,0,0,.45);cursor:default";
  return el;
}

export function RoutePlanner() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const draftRef = useRef<LngLat[]>([]);
  const draftMarkers = useRef<maplibregl.Marker[]>([]);

  const [ready, setReady] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<LngLat[]>([]);
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [type, setType] = useState<RouteType>("sdr");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- init map ----
  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: darkStyle(),
      center: [10, 25],
      zoom: 1.6,
      maxZoom: 19,
      attributionControl: false,
      dragRotate: false,
    });
    mapRef.current = map;
    map.on("error", () => {});
    map.on("load", () => {
      map.addSource("saved-routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "saved-routes",
        type: "line",
        source: "saved-routes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["match", ["get", "type"], "sdr", "#e0b24a", "extraction", "#74b277", "variation", "#7fb2ff", "#9aa39c"],
          "line-width": 3,
          "line-opacity": 0.85,
        },
      });
      map.addSource("draft-line", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "draft-line",
        type: "line",
        source: "draft-line",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#f0f0f0", "line-width": 2, "line-dasharray": [2, 1.5], "line-opacity": 0.9 },
      });
      setReady(true);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- load + render saved routes ----
  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const res = await fetch("/api/routes");
        const data = (await res.json()) as { routes?: SavedRoute[] };
        setRoutes(data.routes ?? []);
      } catch {
        /* offline-first — leave empty */
      }
    })();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const src = mapRef.current?.getSource("saved-routes") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const features = routes
      .filter((r) => !hidden.has(r.id))
      .map((r) => {
        let pts: LngLat[] = [];
        try {
          pts = JSON.parse(r.waypoints) as LngLat[];
        } catch {
          pts = [];
        }
        const coords = pts.filter((p) => Number.isFinite(p?.lng) && Number.isFinite(p?.lat)).map((p) => [p.lng, p.lat]);
        if (coords.length < 2) return null;
        return { type: "Feature" as const, properties: { type: r.type, id: r.id }, geometry: { type: "LineString" as const, coordinates: coords } };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);
    src.setData({ type: "FeatureCollection", features });
  }, [routes, hidden, ready]);

  // ---- draw interaction ----
  function updateDraftLine() {
    const src = mapRef.current?.getSource("draft-line") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const coords = draftRef.current.map((p) => [p.lng, p.lat]);
    src.setData(
      coords.length >= 2
        ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } }] }
        : { type: "FeatureCollection", features: [] },
    );
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (!drawing) return;
      const p: LngLat = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      const next = [...draftRef.current, p];
      draftRef.current = next;
      setDraft(next);
      const mk = new maplibregl.Marker({ element: numDot(next.length) }).setLngLat([p.lng, p.lat]).addTo(map);
      draftMarkers.current.push(mk);
      updateDraftLine();
    };
    map.on("click", onClick);
    map.getCanvas().style.cursor = drawing ? "crosshair" : "";
    return () => {
      map.off("click", onClick);
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = "";
    };
  }, [drawing, ready]);

  function undo() {
    const next = draftRef.current.slice(0, -1);
    draftRef.current = next;
    setDraft(next);
    draftMarkers.current.pop()?.remove();
    updateDraftLine();
  }

  function clearDraft() {
    draftRef.current = [];
    setDraft([]);
    draftMarkers.current.forEach((m) => m.remove());
    draftMarkers.current = [];
    updateDraftLine();
  }

  async function save() {
    if (draftRef.current.length < 2) {
      setError("Add at least two points before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    const m = routeMetrics(draftRef.current);
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name: name.trim() || null, waypoints: draftRef.current, distance_m: m.totalM }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { route } = (await res.json()) as { route: SavedRoute };
      setRoutes((prev) => [route, ...prev]);
      setName("");
      clearDraft();
      setDrawing(false);
    } catch {
      setError("Couldn't save the route — the local server may be unreachable.");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    const prev = routes;
    setRoutes((p) => p.filter((r) => r.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/routes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setRoutes(prev); // rollback
      setError("Couldn't delete the route.");
    }
  }

  const metrics = routeMetrics(draft);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-accent-subtle/40 p-4 text-sm text-faint">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-accent-text" />
        <p>
          Plan a <strong className="text-foreground">surveillance-detection</strong> or <strong className="text-foreground">egress</strong> route by clicking points
          on the map. An SDR deliberately deviates and passes choke points so a follower must commit to an obvious move; a variation breaks a routine pattern. Routes
          are stored locally only — nothing is sent anywhere. Defensive planning aid, not legal advice.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border">
        <div ref={ref} className="h-[60vh] w-full" />

        <div className="absolute right-3 top-3 w-64 rounded-xl border border-white/10 bg-black/80 p-3 text-white shadow-lg backdrop-blur">
          <p className="label-caps mb-2 text-white/50">Draw a route</p>
          <div className="flex flex-wrap gap-1.5">
            {ROUTE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={type === t.value}
                title={t.hint}
                onClick={() => setType(t.value)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                  type === t.value ? "border-white/40 bg-white/15 text-white" : "border-white/15 text-white/60 hover:text-white",
                )}
              >
                <span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: t.color }} />
                {t.label}
              </button>
            ))}
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Route name (optional)"
            aria-label="Route name"
            className="mt-2 w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
          />

          <div className="mt-2 flex gap-1.5">
            <Button size="sm" variant={drawing ? "default" : "outline"} className="flex-1" onClick={() => setDrawing((d) => !d)}>
              <Pencil className="size-4" /> {drawing ? "Drawing…" : "Draw"}
            </Button>
            <Button size="sm" variant="outline" onClick={undo} disabled={draft.length === 0} aria-label="Undo last point">
              <Undo2 className="size-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={clearDraft} disabled={draft.length === 0} aria-label="Clear route">
              <Trash2 className="size-4" />
            </Button>
          </div>

          {draft.length >= 2 && (
            <dl className="mt-2 space-y-0.5 text-[11px] text-white/70">
              <div className="flex justify-between"><dt className="text-white/45">Length</dt><dd>{formatDistance(metrics.totalM)}</dd></div>
              <div className="flex justify-between"><dt className="text-white/45">Direct</dt><dd>{formatDistance(metrics.directM)}</dd></div>
              <div className="flex justify-between"><dt className="text-white/45">Deviation</dt><dd>{metrics.deviationRatio.toFixed(2)}×</dd></div>
              <div className="text-white/45">{deviationLabel(metrics.deviationRatio)}</div>
            </dl>
          )}

          <Button size="sm" className="mt-2 w-full" onClick={save} disabled={draft.length < 2 || saving}>
            <Save className="size-4" /> {saving ? "Saving…" : "Save route"}
          </Button>
          {error && <p role="alert" className="mt-2 text-[11px] text-[#f0a59a]">{error}</p>}
        </div>

        <div className="pointer-events-none absolute left-3 top-3 max-w-[16rem] rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-xs text-white/80 backdrop-blur">
          Click <span className="text-white">Draw</span>, then click the map to drop ordered waypoints. © OpenStreetMap
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="label-caps flex items-center gap-2"><RouteIcon className="size-3.5" /> Saved routes</h2>
        {routes.length === 0 ? (
          <p className="text-sm text-faint">No routes yet. Draw one above and save it.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {routes.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: ROUTE_COLOR[r.type] ?? "#9aa39c" }} />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{r.name || "Untitled route"}</span>
                  <span className="ml-2 text-xs uppercase tracking-wide text-faint">{r.type}</span>
                </span>
                <span className="shrink-0 text-xs text-faint">{r.distance_m != null ? formatDistance(r.distance_m) : "—"}</span>
                <button
                  type="button"
                  onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })}
                  aria-label={hidden.has(r.id) ? `Show ${r.name || "route"}` : `Hide ${r.name || "route"}`}
                  className="shrink-0 text-faint transition-colors hover:text-foreground"
                >
                  {hidden.has(r.id) ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => del(r.id)}
                  aria-label={`Delete ${r.name || "route"}`}
                  className="shrink-0 text-faint transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
