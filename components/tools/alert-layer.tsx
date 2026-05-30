"use client";

import { useMemo, useState } from "react";
import { Siren, AlertTriangle, RefreshCw, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  normalizeGdacs,
  normalizeUsgs,
  rationalize,
  type RationalizeResult,
  type Priority,
} from "@/lib/alarm-rationalization";

/* Rationalized hazard alert layer (EEMUA-191). Pulls the GDACS + USGS feeds via
 * /api/map/alerts (each behind its connector toggle) OR rationalizes a pasted
 * feed export fully offline. De-duplicates, prioritises by severity + proximity,
 * and flood-suppresses per band, so the operator sees a short, ranked,
 * actionable list instead of a marker flood. Ranking is the pure
 * lib/alarm-rationalization logic. */

const BAND_TONE: Record<Priority, string> = {
  4: "text-destructive",
  3: "text-destructive",
  2: "text-warning",
  1: "text-success",
  0: "text-faint",
};

const KIND_EMOJI: Record<string, string> = {
  earthquake: "🌐",
  cyclone: "🌀",
  flood: "🌊",
  volcano: "🌋",
  drought: "🏜️",
  wildfire: "🔥",
  other: "⚠️",
};

export function AlertLayer() {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [radiusKm, setRadiusKm] = useState("");
  const [result, setResult] = useState<RationalizeResult | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteJson, setPasteJson] = useState("");

  const origin = useMemo(() => {
    const la = Number(lat);
    const lo = Number(lon);
    return Number.isFinite(la) && Number.isFinite(lo) && (lat !== "" && lon !== "")
      ? { lat: la, lon: lo }
      : undefined;
  }, [lat, lon]);

  async function fetchLive() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (origin) {
        qs.set("lat", String(origin.lat));
        qs.set("lon", String(origin.lon));
        if (radiusKm) qs.set("radiusKm", radiusKm);
      }
      const res = await fetch(`/api/map/alerts?${qs.toString()}`);
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Could not load alerts.");
      } else {
        setEnabled(data.enabled);
        setResult(data.result);
      }
    } catch {
      setError("Request failed.");
    } finally {
      setLoading(false);
    }
  }

  function rationalizePaste() {
    setError(null);
    setEnabled(true);
    try {
      const parsed = JSON.parse(pasteJson) as {
        gdacs?: { features?: unknown[] };
        usgs?: { features?: unknown[] };
        features?: unknown[];
      };
      const gdacsF = (parsed.gdacs?.features ?? parsed.features ?? []) as Parameters<typeof normalizeGdacs>[0];
      const usgsF = (parsed.usgs?.features ?? []) as Parameters<typeof normalizeUsgs>[0];
      const alerts = [...normalizeGdacs(gdacsF), ...normalizeUsgs(usgsF)];
      setResult(
        rationalize(alerts, {
          origin,
          radiusKm: origin && radiusKm ? Number(radiusKm) : undefined,
        }),
      );
    } catch {
      setError("Could not parse that JSON.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="size-4 text-faint" /> Focus (optional)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Add your position to rank alerts by proximity and optionally limit to a radius.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-lg sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="al-lat" className="text-xs uppercase text-faint">Lat</Label>
            <Input id="al-lat" value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" className="font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="al-lon" className="text-xs uppercase text-faint">Lon</Label>
            <Input id="al-lon" value={lon} onChange={(e) => setLon(e.target.value)} inputMode="decimal" className="font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="al-r" className="text-xs uppercase text-faint">Radius km</Label>
            <Input id="al-r" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} inputMode="numeric" className="font-mono text-sm" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={fetchLive} disabled={loading} size="sm">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> {loading ? "Loading…" : "Load live alerts"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-faint">
          Live data needs the GDACS and/or USGS connectors enabled in Settings → Connections (off by default).
        </p>
      </section>

      <details className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <summary className="cursor-pointer text-sm font-medium text-foreground">Rationalize a pasted feed (offline)</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Paste <span className="font-mono">{`{ "gdacs": {...}, "usgs": {...} }`}</span> (each the raw GeoJSON), or a single
          GeoJSON with a <span className="font-mono">features</span> array. Rationalization runs in your browser.
        </p>
        <textarea
          value={pasteJson}
          onChange={(e) => setPasteJson(e.target.value)}
          rows={5}
          className="mt-3 w-full rounded-md border border-input bg-transparent p-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          placeholder='{"usgs":{"features":[{"id":"x","properties":{"mag":6.2,"place":"…","time":0},"geometry":{"coordinates":[13.4,52.5,10]}}]}}'
        />
        <Button onClick={rationalizePaste} size="sm" className="mt-3">Rationalize</Button>
      </details>

      {error && (
        <p className="inline-flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4" /> {error}
        </p>
      )}

      {enabled === false && (
        <p className="inline-flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
          <AlertTriangle className="size-4 text-warning" />
          Both hazard connectors are off. Enable GDACS / USGS in Settings → Connections, or paste a feed to rationalize offline.
        </p>
      )}

      {result && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <Siren className="size-5 text-faint" />
              {result.alerts.length} prioritised alert{result.alerts.length === 1 ? "" : "s"}
            </h2>
            <span className="font-mono text-xs text-faint">
              {result.totalIn} in · {result.deduped} merged · {result.filtered} filtered · {result.suppressed} suppressed
            </span>
          </div>

          {result.alerts.length === 0 ? (
            <p className="text-sm text-success">No relevant hazards after rationalization.</p>
          ) : (
            <ol className="space-y-2">
              {result.alerts.map((a) => (
                <li key={a.id} className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                      <span aria-hidden>{KIND_EMOJI[a.kind] ?? "⚠️"}</span>
                      {a.title}
                      {a.mergedCount > 1 && <span className="text-xs text-faint">+{a.mergedCount - 1} more reports</span>}
                    </p>
                    <span className={`rounded-md border px-2 py-0.5 font-mono text-xs ${BAND_TONE[a.priority]} border-current/40`}>
                      {a.priorityLabel}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{a.action}</p>
                  <p className="mt-1 font-mono text-[11px] text-faint">
                    {a.lat.toFixed(2)}, {a.lon.toFixed(2)}
                    {a.distanceKm != null && ` · ${Math.round(a.distanceKm)} km away`}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
