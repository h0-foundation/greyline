"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Plus, Trash2, ShieldAlert, ListChecks, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ThreatDial } from "@/components/trip/threat-dial";
import { cn } from "@/lib/utils";
import { THREAT, TONE_CLASS, type ThreatLevel } from "@/lib/intel";
import { OPSEC_TEMPLATES, itemsForLevel } from "@/lib/opsec";
import { formatTripDate, type DatePrecision } from "@/lib/trip-format";
import type { CountryListItem } from "@/lib/countries";

type Trip = { id: string; name: string; status: string; start_date: string | null; end_date: string | null; notes: string | null; date_precision?: string };
type Destination = { id: string; country_code: string | null; city: string | null; arrival_date: string | null; departure_date: string | null; sort_order: number; notes: string | null };
type ChecklistItem = { id: string; label: string; checked: boolean; notes?: string };
type Checklist = { id: string; type: string; name: string; items: string };
type ThreatModel = { computed_level: string | null } | null;
type DestIntel = Record<string, { suggested: ThreatLevel }>;

const STATUSES = ["planning", "active", "wrapped"];

export function TripDetail({
  trip, destinations, checklists, threatModel, countries, destIntel, suggestedLevel,
}: {
  trip: Trip; destinations: Destination[]; checklists: Checklist[];
  threatModel: ThreatModel; countries: CountryListItem[]; destIntel: DestIntel; suggestedLevel: ThreatLevel;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(trip.status);
  const [level, setLevel] = useState<ThreatLevel>(
    (threatModel?.computed_level as ThreatLevel) || suggestedLevel,
  );
  const [wizardOpen, setWizardOpen] = useState(false);
  const countryName = (code: string | null) =>
    countries.find((c) => c.code === code)?.name ?? code ?? "—";
  const countryFlag = (code: string | null) =>
    countries.find((c) => c.code === code)?.flag ?? "";

  async function setTripStatus(next: string) {
    setStatus(next);
    await fetch(`/api/trips/${trip.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
  }

  async function persistLevel(next: ThreatLevel) {
    setLevel(next);
    await fetch(`/api/trips/${trip.id}/threat-model`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ computed_level: next }),
    });
  }

  async function generateOpsec() {
    for (const phase of OPSEC_TEMPLATES) {
      await fetch(`/api/trips/${trip.id}/checklists`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: phase.type, name: phase.name, items: itemsForLevel(phase, level) }),
      });
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{trip.name}</h1>
          <p className="font-mono text-xs text-faint tabular-nums">
            {formatTripDate(trip.start_date, trip.end_date, (trip.date_precision as DatePrecision) ?? "day") ?? "No dates set"}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTripStatus(s)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                status === s ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Threat dial + wizard */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs lg:col-span-1">
          <ThreatDial level={level} onChange={persistLevel} suggested={suggestedLevel} />
          <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setWizardOpen(true)}>
            <ShieldAlert className="size-4" /> Threat-model wizard
          </Button>
        </section>

        {/* Destinations */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs lg:col-span-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
            <MapPin className="size-3.5" /> Destinations
          </h2>
          <DestinationEditor tripId={trip.id} countries={countries} />
          {destinations.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No destinations yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {destinations.map((d) => {
                const di = destIntel[d.id];
                return (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span aria-hidden>{countryFlag(d.country_code)}</span>
                      <Link href={`/countries/${d.country_code}`} className="truncate text-sm text-foreground hover:text-accent-text">
                        {d.city ? `${d.city}, ` : ""}{countryName(d.country_code)}
                      </Link>
                      {di && (
                        <Badge variant="outline" className={cn("text-[10px]", TONE_CLASS[THREAT[di.suggested].tone])}>
                          {THREAT[di.suggested].label}
                        </Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="Remove destination"
                      onClick={async () => { await fetch(`/api/destinations/${d.id}`, { method: "DELETE" }); router.refresh(); }}
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

      {/* OPSEC checklists */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
            <ListChecks className="size-3.5" /> OPSEC checklists
          </h2>
          {checklists.length === 0 && (
            <Button size="sm" onClick={generateOpsec}>
              <Plus className="size-4" /> Generate for {THREAT[level].label}
            </Button>
          )}
        </div>
        {checklists.length === 0 ? (
          <p className="mt-3 max-w-prose text-sm text-muted-foreground">
            Generate a phased checklist (pre-trip · border · on-the-ground · post-trip) tuned to your
            threat level. Items scale up as the level rises. Grounded in EFF, FPF, CPJ, and GIJN guidance.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {checklists.map((cl) => (
              <ChecklistBlock key={cl.id} checklist={cl} />
            ))}
          </div>
        )}
      </section>

      <ThreatModelWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        tripId={trip.id}
        onComputed={(l) => { setLevel(l); router.refresh(); }}
      />
    </div>
  );
}

function DestinationEditor({ tripId, countries }: { tripId: string; countries: CountryListItem[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const match = countries.find((c) => c.code === code.toUpperCase() || c.name.toLowerCase() === code.toLowerCase());
    if (!match) return;
    setSaving(true);
    await fetch(`/api/trips/${tripId}/destinations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country_code: match.code, city }),
    });
    setSaving(false);
    setCode(""); setCity("");
    router.refresh();
  }

  return (
    <form onSubmit={add} className="mt-3 flex flex-wrap gap-2">
      <Input
        list="country-options"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Country (name or code)"
        className="w-44"
        aria-label="Country"
      />
      <datalist id="country-options">
        {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
      </datalist>
      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)" className="w-40" aria-label="City" />
      <Button type="submit" variant="outline" size="sm" disabled={saving || !code}>
        <Plus className="size-4" /> Add
      </Button>
    </form>
  );
}

function ChecklistBlock({ checklist }: { checklist: Checklist }) {
  const initial: ChecklistItem[] = (() => {
    try { return JSON.parse(checklist.items); } catch { return []; }
  })();
  const [items, setItems] = useState(initial);
  const done = items.filter((i) => i.checked).length;

  async function toggle(itemId: string) {
    const next = items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i));
    setItems(next);
    await fetch(`/api/checklists/${checklist.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: next }),
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{checklist.name}</h3>
        <span className="font-mono text-xs text-faint tabular-nums">{done}/{items.length}</span>
      </div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id}>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent/50">
              <Checkbox checked={it.checked} onCheckedChange={() => toggle(it.id)} className="mt-0.5" />
              <span className={cn("text-sm", it.checked ? "text-faint line-through" : "text-foreground")}>{it.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ADVERSARIES = ["Petty crime", "Corporate / ad-tech", "Local authorities", "State / intelligence", "Personal (stalker)"];

function ThreatModelWizard({
  open, onOpenChange, tripId, onComputed,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; tripId: string; onComputed: (l: ThreatLevel) => void;
}) {
  const [adversaries, setAdversaries] = useState<string[]>([]);
  const [capability, setCapability] = useState("medium");
  const [consequence, setConsequence] = useState("medium");

  function compute(): ThreatLevel {
    let score = 0;
    if (adversaries.includes("State / intelligence")) score += 3;
    if (adversaries.includes("Local authorities")) score += 1;
    if (adversaries.includes("Personal (stalker)")) score += 1;
    score += { low: 0, medium: 1, high: 2, state: 3 }[capability] ?? 1;
    score += { low: 0, medium: 1, high: 2, severe: 3 }[consequence] ?? 1;
    if (score >= 6) return "extreme";
    if (score >= 4) return "high";
    if (score >= 2) return "elevated";
    return "routine";
  }

  async function save() {
    const level = compute();
    await fetch(`/api/trips/${tripId}/threat-model`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adversaries, capability, consequence, computed_level: level }),
    });
    onComputed(level);
    onOpenChange(false);
  }

  const Seg = ({ value, set, opts }: { value: string; set: (v: string) => void; opts: string[] }) => (
    <div className="inline-flex flex-wrap gap-1.5">
      {opts.map((o) => (
        <button key={o} type="button" onClick={() => set(o)}
          className={cn("rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
            value === o ? "border-transparent bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent")}>
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <DialogTitle className="font-display text-lg font-semibold">Threat-model wizard</DialogTitle>
            <DialogDescription>
              Based on EFF&apos;s five questions. Your answers compute a proportional threat level — no jargon, nothing stored off-device.
            </DialogDescription>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Who are you protecting against?</p>
            <div className="flex flex-wrap gap-1.5">
              {ADVERSARIES.map((a) => (
                <button key={a} type="button"
                  onClick={() => setAdversaries((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a])}
                  className={cn("rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    adversaries.includes(a) ? "border-transparent bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent")}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">How capable is the adversary?</p>
            <Seg value={capability} set={setCapability} opts={["low", "medium", "high", "state"]} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">How bad are the consequences?</p>
            <Seg value={consequence} set={setConsequence} opts={["low", "medium", "high", "severe"]} />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">
              Suggested: <span className={cn("font-medium", TONE_CLASS[THREAT[compute()].tone])}>{THREAT[compute()].label}</span>
            </span>
            <Button onClick={save}>Apply level <ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
