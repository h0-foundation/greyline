"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Crosshair, Plus, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeExposure, type Observer, type Footprint, type ExposureReport } from "@/lib/viewshed";

/* Line-of-sight exposure — fully on-device. Enter your position and the
 * observers around you (CCTV, a tail's vantage point); optionally describe the
 * walls/buildings between you. The tool reports which observers actually have a
 * clear line of sight and your overall exposure. Pure geometry (lib/viewshed),
 * nothing leaves the machine. */

type ObsRow = { id: string; lat: string; lon: string; label: string; rangeM: string };

const BAND_TONE: Record<ExposureReport["band"], string> = {
  clear: "text-success",
  low: "text-success",
  moderate: "text-warning",
  high: "text-destructive",
};

const BAND_LABEL: Record<ExposureReport["band"], string> = {
  clear: "No line of sight",
  low: "Low exposure",
  moderate: "Moderate exposure",
  high: "High exposure",
};

function parseLngLat(lat: string, lon: string): { lat: number; lon: number } | null {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return { lat: la, lon: lo };
}

let idSeq = 0;
const newRow = (): ObsRow => ({ id: `o${idSeq++}`, lat: "", lon: "", label: "", rangeM: "" });

export function ViewshedTool() {
  const [meLat, setMeLat] = useState("");
  const [meLon, setMeLon] = useState("");
  const [rows, setRows] = useState<ObsRow[]>([newRow(), newRow()]);
  // Optional footprints: each is a textarea of "lat,lon" lines forming a wall.
  const [wallText, setWallText] = useState("");

  const target = parseLngLat(meLat, meLon);

  const observers: Observer[] = useMemo(
    () =>
      rows
        .map((r) => {
          const p = parseLngLat(r.lat, r.lon);
          if (!p) return null;
          const range = Number(r.rangeM);
          return {
            id: r.id,
            lat: p.lat,
            lon: p.lon,
            label: r.label.trim() || undefined,
            rangeM: Number.isFinite(range) && range > 0 ? range : undefined,
          } as Observer;
        })
        .filter((o): o is Observer => o !== null),
    [rows],
  );

  const footprints: Footprint[] = useMemo(() => {
    if (!wallText.trim()) return [];
    // Blank lines separate walls; each non-blank line is "lat,lon".
    const walls: Footprint = [];
    const out: Footprint[] = [];
    for (const line of wallText.split("\n")) {
      const t = line.trim();
      if (!t) {
        if (walls.length) out.push([...walls]);
        walls.length = 0;
        continue;
      }
      const [la, lo] = t.split(",").map((s) => Number(s.trim()));
      if (Number.isFinite(la) && Number.isFinite(lo)) walls.push({ lat: la, lon: lo });
    }
    if (walls.length) out.push([...walls]);
    return out.filter((w) => w.length >= 2);
  }, [wallText]);

  const report = useMemo(
    () => (target && observers.length ? computeExposure(target, observers, footprints) : null),
    [target, observers, footprints],
  );

  const labelFor = (id: string) => rows.find((r) => r.id === id)?.label?.trim() || id;

  return (
    <div className="space-y-6">
      {/* Your position */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Crosshair className="size-4 text-faint" /> Your position
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="space-y-1">
            <Label htmlFor="me-lat" className="text-xs uppercase text-faint">Latitude</Label>
            <Input id="me-lat" value={meLat} onChange={(e) => setMeLat(e.target.value)} inputMode="decimal" className="font-mono text-sm" placeholder="52.5000" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="me-lon" className="text-xs uppercase text-faint">Longitude</Label>
            <Input id="me-lon" value={meLon} onChange={(e) => setMeLon(e.target.value)} inputMode="decimal" className="font-mono text-sm" placeholder="13.4000" />
          </div>
        </div>
      </section>

      {/* Observers */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <Eye className="size-4 text-faint" /> Observers
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setRows((r) => [...r, newRow()])}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Cameras, a parked car, a café window — anything that might watch you. Range (m) is optional (default 60 m).
        </p>
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 sm:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]">
              <div className="space-y-1">
                <Label htmlFor={`lbl-${r.id}`} className="text-[10px] uppercase text-faint">Label</Label>
                <Input id={`lbl-${r.id}`} value={r.label} onChange={(e) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, label: e.target.value } : x))} placeholder="ALPR camera" className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`lat-${r.id}`} className="text-[10px] uppercase text-faint">Lat</Label>
                <Input id={`lat-${r.id}`} value={r.lat} onChange={(e) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, lat: e.target.value } : x))} inputMode="decimal" className="font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`lon-${r.id}`} className="text-[10px] uppercase text-faint">Lon</Label>
                <Input id={`lon-${r.id}`} value={r.lon} onChange={(e) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, lon: e.target.value } : x))} inputMode="decimal" className="font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`rng-${r.id}`} className="text-[10px] uppercase text-faint">Range</Label>
                <Input id={`rng-${r.id}`} value={r.rangeM} onChange={(e) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, rangeM: e.target.value } : x))} inputMode="numeric" className="font-mono text-sm" placeholder="60" />
              </div>
              <Button variant="ghost" size="icon" aria-label="Remove observer" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} disabled={rows.length <= 1}>
                <Trash2 className="size-4 text-faint" />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {/* Optional obstructions */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="text-sm font-medium text-foreground">Walls &amp; buildings between you (optional)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          One <span className="font-mono">lat,lon</span> per line; a blank line starts a new wall. A sight line that crosses
          any wall is treated as blocked.
        </p>
        <textarea
          value={wallText}
          onChange={(e) => setWallText(e.target.value)}
          rows={4}
          placeholder={"52.50005,13.40005\n52.50012,13.40015"}
          className="mt-3 w-full rounded-md border border-input bg-transparent p-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </section>

      {/* Result */}
      {report && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <ShieldAlert className={`size-5 ${BAND_TONE[report.band]}`} />
              <span className={BAND_TONE[report.band]}>{BAND_LABEL[report.band]}</span>
            </h2>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {report.exposedTo} of {report.total} observer{report.total === 1 ? "" : "s"} can see you
            </span>
          </div>
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {report.sightlines.map((s) => (
              <li key={s.observerId} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-sm">
                  {s.visible ? <Eye className="size-4 text-destructive" /> : <EyeOff className="size-4 text-success" />}
                  <span className="text-foreground">{labelFor(s.observerId)}</span>
                </span>
                <span className="inline-flex items-center gap-3">
                  <span className="font-mono text-[11px] text-faint">{Math.round(s.distanceM)} m</span>
                  <span className={`text-xs ${s.visible ? "text-destructive" : "text-success"}`}>
                    {s.visible
                      ? "line of sight"
                      : s.blockedBy === "range"
                        ? "out of range"
                        : "blocked"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!report && (
        <p className="flex items-center gap-2 text-sm text-faint">
          <Crosshair className="size-4" /> Enter your position and at least one observer to compute exposure.
        </p>
      )}
    </div>
  );
}
