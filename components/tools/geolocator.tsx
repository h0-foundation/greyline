"use client";

import { useMemo, useState } from "react";
import { MapPin, Crosshair, ExternalLink, AlertTriangle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FEATURE_TYPES,
  classifyElements,
  clusterByCooccurrence,
  featureLabel,
  type OsmElement,
  type Cluster,
} from "@/lib/geolocate";

/* Feature-cluster geolocation. Pick the distinctive features you can see in a
 * photo, then find the places where they co-occur within a short walk. Works
 * fully offline over a pasted Overpass JSON export; optionally queries the
 * Overpass connector live when the user has enabled it. The ranking is the pure
 * lib/geolocate logic — nothing here touches the network unless you press
 * "Query Overpass live". */

type Mode = "paste" | "live";

export function Geolocator() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["mosque", "fuel", "pharmacy"]));
  const [mode, setMode] = useState<Mode>("paste");
  const [radius, setRadius] = useState(300);
  const [json, setJson] = useState("");
  const [bbox, setBbox] = useState({ s: "", w: "", n: "", e: "" });
  const [elements, setElements] = useState<OsmElement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectorOff, setConnectorOff] = useState(false);
  const [loading, setLoading] = useState(false);

  const types = useMemo(() => [...selected], [selected]);

  const clusters: Cluster[] = useMemo(() => {
    if (!elements || types.length === 0) return [];
    const features = classifyElements(elements, types);
    return clusterByCooccurrence(features, types, radius).slice(0, 20);
  }, [elements, types, radius]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runPaste() {
    setError(null);
    setConnectorOff(false);
    if (types.length === 0) {
      setError("Pick at least one feature type.");
      return;
    }
    try {
      const parsed = JSON.parse(json) as { elements?: OsmElement[] };
      if (!parsed || !Array.isArray(parsed.elements)) {
        setError('Expected Overpass JSON with an "elements" array.');
        setElements(null);
        return;
      }
      setElements(parsed.elements);
    } catch {
      setError("Could not parse that as JSON.");
      setElements(null);
    }
  }

  async function runLive() {
    setError(null);
    setConnectorOff(false);
    if (types.length === 0) {
      setError("Pick at least one feature type.");
      return;
    }
    const s = Number(bbox.s);
    const w = Number(bbox.w);
    const n = Number(bbox.n);
    const e = Number(bbox.e);
    if ([s, w, n, e].some((x) => Number.isNaN(x))) {
      setError("Enter four numeric bounding-box coordinates.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/geolocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types, bbox: { s, w, n, e } }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Query failed.");
        setElements(null);
      } else if (!data.enabled) {
        setConnectorOff(true);
        setElements(null);
      } else {
        setElements(data.elements as OsmElement[]);
      }
    } catch {
      setError("Network request failed.");
      setElements(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Feature picker */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Layers className="size-4 text-faint" /> Features in the photo
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tick every distinctive feature you can identify. The more types that cluster
          together, the stronger the candidate location.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {FEATURE_TYPES.map((f) => {
            const on = selected.has(f.id);
            return (
              <li key={f.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(f.id)}
                  title={f.hint}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                    on
                      ? "border-accent/50 bg-accent/10 font-medium text-accent-text"
                      : "border-border bg-background/50 text-muted-foreground hover:border-accent/30"
                  }`}
                >
                  {f.label}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Radius */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
        <Crosshair className="size-4 text-faint" />
        <Label htmlFor="geo-radius" className="text-sm text-foreground">
          Co-occurrence radius
        </Label>
        <Input
          id="geo-radius"
          type="number"
          min={20}
          max={2000}
          step={20}
          value={radius}
          onChange={(e) => setRadius(Math.max(20, Math.min(2000, Number(e.target.value) || 0)))}
          className="w-24 font-mono text-sm"
        />
        <span className="text-xs text-faint">metres — roughly a {Math.round(radius / 80)}-minute walk apart</span>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button variant={mode === "paste" ? "default" : "ghost"} size="sm" onClick={() => setMode("paste")}>
          Paste Overpass JSON (offline)
        </Button>
        <Button variant={mode === "live" ? "default" : "ghost"} size="sm" onClick={() => setMode("live")}>
          Query Overpass live
        </Button>
      </div>

      {mode === "paste" ? (
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <Label htmlFor="geo-json" className="block text-sm font-medium text-foreground">
            Overpass JSON
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Run a query at overpass-turbo.eu for your area of interest, export the JSON, and paste
            it here. Nothing is sent anywhere — clustering runs in your browser.
          </p>
          <Textarea
            id="geo-json"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={7}
            placeholder='{"elements":[{"type":"node","id":1,"lat":52.5,"lon":13.4,"tags":{"amenity":"fuel"}}]}'
            className="mt-3 font-mono text-xs"
          />
          <Button onClick={runPaste} className="mt-3" size="sm">
            Find clusters
          </Button>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <Label className="block text-sm font-medium text-foreground">Bounding box</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            South, West, North, East (decimal degrees, max 2°×2°). The Overpass connector is OFF by
            default — enable it in Settings → Connections first.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["s", "w", "n", "e"] as const).map((k) => (
              <div key={k} className="space-y-1">
                <Label htmlFor={`bbox-${k}`} className="text-xs uppercase text-faint">
                  {{ s: "South", w: "West", n: "North", e: "East" }[k]}
                </Label>
                <Input
                  id={`bbox-${k}`}
                  value={bbox[k]}
                  onChange={(e) => setBbox((b) => ({ ...b, [k]: e.target.value }))}
                  className="font-mono text-sm"
                  inputMode="decimal"
                />
              </div>
            ))}
          </div>
          <Button onClick={runLive} className="mt-3" size="sm" disabled={loading}>
            {loading ? "Querying…" : "Query Overpass live"}
          </Button>
        </section>
      )}

      {error && (
        <p className="inline-flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4" /> {error}
        </p>
      )}
      {connectorOff && (
        <p className="inline-flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
          <AlertTriangle className="size-4 text-warning" />
          The Overpass connector is off. Enable it in Settings → Connections, or paste an Overpass
          JSON export to work fully offline.
        </p>
      )}

      {/* Results */}
      {elements && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            {clusters.length === 0
              ? "No co-occurring clusters found for those features at this radius."
              : `${clusters.length} candidate location${clusters.length === 1 ? "" : "s"}, strongest first`}
          </h2>
          <ol className="space-y-3">
            {clusters.map((c, i) => (
              <li
                key={`${c.lat.toFixed(5)},${c.lon.toFixed(5)}`}
                className="rounded-xl border border-border bg-card p-4 shadow-xs"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="inline-flex items-center gap-2 font-display text-base font-semibold text-foreground">
                    <MapPin className="size-4 text-accent-text" />
                    Candidate {i + 1}
                    <span className="font-mono text-xs tabular-nums text-faint">
                      {c.lat.toFixed(5)}, {c.lon.toFixed(5)}
                    </span>
                  </p>
                  <span className="rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent-text">
                    {c.matchedCount}/{types.length} types
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {c.matchedTypeIds.map((t) => featureLabel(t)).join(" · ")}
                </p>
                <p className="mt-1 font-mono text-[11px] text-faint">
                  {c.members.length} feature{c.members.length === 1 ? "" : "s"} · spread ≈{" "}
                  {Math.round(c.spreadMeters)} m
                </p>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}#map=17/${c.lat}/${c.lon}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-accent-text hover:underline"
                >
                  Open on OpenStreetMap <ExternalLink className="size-3" />
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
