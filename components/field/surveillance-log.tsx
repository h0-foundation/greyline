"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Eye, AlertTriangle, MapPin, Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TONE_CLASS, type Tone } from "@/lib/intel";
import { type TeddSignal, TEDD_BAND_LABEL } from "@/lib/tedd";

type Sighting = {
  id: string;
  timestamp: string;
  lat: number | null;
  lng: number | null;
  description: string | null;
  person_desc: string | null;
  vehicle_desc: string | null;
  threat_level: string;
  tags: string;
  linked_ids: string;
};

type RallyPoint = {
  id: string;
  trip_id: string | null;
  name: string;
  lat: number;
  lng: number;
  time_start: string | null;
  time_end: string | null;
  instructions: string | null;
};

type ThreatLevel = "low" | "medium" | "high" | "critical";

const THREAT_TONE: Record<string, Tone> = {
  low: "good",
  medium: "caution",
  high: "warn",
  critical: "danger",
};

const THREAT_BADGE: Record<string, "outline" | "destructive"> = {
  low: "outline",
  medium: "outline",
  high: "outline",
  critical: "destructive",
};

const THREAT_OPTIONS: { value: ThreatLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const TEDD = [
  { k: "T", label: "Time", hint: "seen across different times" },
  { k: "E", label: "Environments", hint: "seen in unrelated places" },
  { k: "D", label: "Distance", hint: "keeps pace / mirrors movement" },
  { k: "D", label: "Demeanor", hint: "reacts to you, poor cover" },
];

function parseLatLng(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function SurveillanceLog({
  sightings: initialSightings,
  signals,
  rallyPoints: initialRally,
}: {
  sightings: Sighting[];
  signals: TeddSignal[];
  rallyPoints: RallyPoint[];
}) {
  const router = useRouter();
  const [sightings, setSightings] = useState(initialSightings);
  const [rallyPoints, setRallyPoints] = useState(initialRally);

  // Sighting form state
  const [description, setDescription] = useState("");
  const [personDesc, setPersonDesc] = useState("");
  const [vehicleDesc, setVehicleDesc] = useState("");
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>("low");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [savingSighting, setSavingSighting] = useState(false);

  async function logSighting(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() && !personDesc.trim() && !vehicleDesc.trim()) return;
    setSavingSighting(true);
    const res = await fetch("/api/surveillance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: description.trim() || null,
        person_desc: personDesc.trim() || null,
        vehicle_desc: vehicleDesc.trim() || null,
        threat_level: threatLevel,
        lat: parseLatLng(lat),
        lng: parseLatLng(lng),
      }),
    });
    setSavingSighting(false);
    if (res.ok) {
      const data = (await res.json()) as { ok: boolean; sighting: Sighting };
      if (data.ok) setSightings((p) => [data.sighting, ...p]);
      setDescription(""); setPersonDesc(""); setVehicleDesc("");
      setThreatLevel("low"); setLat(""); setLng("");
      router.refresh();
    }
  }

  async function deleteSighting(id: string) {
    setSightings((p) => p.filter((s) => s.id !== id));
    await fetch(`/api/surveillance/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* TEDD explainer */}
      <div className="flex flex-wrap gap-2">
        {TEDD.map((t) => (
          <div
            key={t.label}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-accent-subtle px-2.5 py-1.5"
          >
            <span className="font-mono text-xs font-semibold text-accent-text">{t.k}</span>
            <span className="text-xs font-medium text-foreground">{t.label}</span>
            <span className="text-xs text-muted-foreground">{t.hint}</span>
          </div>
        ))}
      </div>

      {/* TEDD pattern analysis — scores recurrences by time-spread + distance,
          not just repeat count. The same party across different times AND places
          is the real signal; a same-spot repeat is a coincidence. */}
      {signals.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
            <AlertTriangle className="size-3.5" /> TEDD pattern analysis
          </h2>
          <ul className="mt-3 space-y-2">
            {signals.map((sig) => {
              const danger = sig.band === "probable-surveillance";
              const toneCls = danger ? "text-destructive" : sig.band === "pattern" ? "text-warning" : "text-faint";
              return (
                <li
                  key={`${sig.kind}:${sig.descriptor}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                >
                  <Badge
                    variant={danger ? "destructive" : "outline"}
                    className={cn("shrink-0", !danger && toneCls)}
                  >
                    {TEDD_BAND_LABEL[sig.band]}
                  </Badge>
                  <span className="font-mono text-foreground">&ldquo;{sig.descriptor}&rdquo;</span>
                  <span className="text-faint">({sig.kind})</span>
                  <span className="ml-auto font-mono text-xs tabular-nums text-faint">
                    seen {sig.count}× · {sig.hasGeo ? `${sig.maxDistanceKm} km apart` : "no coords"} · {sig.timeSpreadHours}h span
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-faint">
            Scored observationally from Time + Distance recurrence (TEDD). This flags repeated parties — it does
            not infer intent.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Log a sighting */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
            <Eye className="size-3.5" /> Log a sighting
          </h2>
          <form onSubmit={logSighting} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cs-desc">What did you observe?</Label>
              <Textarea
                id="cs-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Context — where, when, why it stood out (TEDD)."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-person">Person description</Label>
              <Input
                id="cs-person"
                value={personDesc}
                onChange={(e) => setPersonDesc(e.target.value)}
                placeholder="Build, clothing, distinguishing marks"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-vehicle">Vehicle description</Label>
              <Input
                id="cs-vehicle"
                value={vehicleDesc}
                onChange={(e) => setVehicleDesc(e.target.value)}
                placeholder="Make, color, partial plate"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-threat">Threat level</Label>
              <Select value={threatLevel} onValueChange={(v) => setThreatLevel(v as ThreatLevel)}>
                <SelectTrigger id="cs-threat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THREAT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cs-lat">Latitude (optional)</Label>
                <Input
                  id="cs-lat"
                  inputMode="decimal"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="e.g. 48.8566"
                  className="font-mono tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-lng">Longitude (optional)</Label>
                <Input
                  id="cs-lng"
                  inputMode="decimal"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="e.g. 2.3522"
                  className="font-mono tabular-nums"
                />
              </div>
            </div>
            <Button type="submit" disabled={savingSighting} className="w-full">
              <Plus className="size-4" /> Log sighting
            </Button>
          </form>
        </section>

        {/* Rally points */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
            <Navigation className="size-3.5" /> Rally points
          </h2>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            Pre-agreed emergency rendezvous locations. Stored only on this machine.
          </p>
          <RallyForm
            onAdded={(p) => setRallyPoints((prev) => [...prev, p])}
          />
          {rallyPoints.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No rally points yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {rallyPoints.map((rp) => (
                <li key={rp.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0 space-y-0.5">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <MapPin className="size-3.5 shrink-0 text-faint" />
                      {rp.name}
                    </p>
                    <p className="font-mono text-xs text-faint tabular-nums">
                      {rp.lat}, {rp.lng}
                    </p>
                    {rp.instructions && (
                      <p className="text-sm text-muted-foreground">{rp.instructions}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Remove rally point"
                    onClick={async () => {
                      setRallyPoints((prev) => prev.filter((x) => x.id !== rp.id));
                      await fetch(`/api/rally/${rp.id}`, { method: "DELETE" });
                      router.refresh();
                    }}
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

      {/* Sightings list */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
          <Eye className="size-3.5" /> Sighting log
        </h2>
        {sightings.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No sightings logged. Record what stands out — patterns emerge over Time and Environments.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {sightings.map((s) => {
              const tone = THREAT_TONE[s.threat_level] ?? "neutral";
              return (
                <li key={s.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <time className="font-mono text-xs text-faint tabular-nums">
                        {s.timestamp}
                      </time>
                      <Badge
                        variant={THREAT_BADGE[s.threat_level] ?? "outline"}
                        className={cn(
                          "text-[10px] capitalize",
                          THREAT_BADGE[s.threat_level] === "destructive" ? "" : TONE_CLASS[tone],
                        )}
                      >
                        {s.threat_level}
                      </Badge>
                    </div>
                    {s.description && (
                      <p className="text-sm text-foreground">{s.description}</p>
                    )}
                    {s.person_desc && (
                      <p className="text-sm text-muted-foreground">
                        <span className="text-faint">Person:</span> {s.person_desc}
                      </p>
                    )}
                    {s.vehicle_desc && (
                      <p className="text-sm text-muted-foreground">
                        <span className="text-faint">Vehicle:</span> {s.vehicle_desc}
                      </p>
                    )}
                    {s.lat !== null && s.lng !== null && (
                      <p className="font-mono text-xs text-faint tabular-nums">
                        {s.lat}, {s.lng}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Delete sighting"
                    onClick={() => deleteSighting(s.id)}
                    className="shrink-0 text-faint transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function RallyForm({ onAdded }: { onAdded: (p: RallyPoint) => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!name.trim() || !Number.isFinite(latN) || !Number.isFinite(lngN) || lat.trim() === "" || lng.trim() === "") return;
    setSaving(true);
    const res = await fetch("/api/rally", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        lat: latN,
        lng: lngN,
        instructions: instructions.trim() || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = (await res.json()) as { ok: boolean; point: RallyPoint };
      if (data.ok) onAdded(data.point);
      setName(""); setLat(""); setLng(""); setInstructions("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={add} className="mt-3 space-y-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (e.g. Hotel lobby)"
        aria-label="Rally point name"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          inputMode="decimal"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="Latitude"
          aria-label="Latitude"
          className="font-mono tabular-nums"
        />
        <Input
          inputMode="decimal"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          placeholder="Longitude"
          aria-label="Longitude"
          className="font-mono tabular-nums"
        />
      </div>
      <Input
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Instructions (optional)"
        aria-label="Instructions"
      />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={saving || !name.trim() || lat.trim() === "" || lng.trim() === ""}
      >
        <Plus className="size-4" /> Add rally point
      </Button>
    </form>
  );
}
