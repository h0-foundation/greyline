"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Ticket,
  PlaneTakeoff,
  Fingerprint,
  Plus,
  X,
  Info,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  buildTrail,
  exposureScore,
  type FlyingIntel,
  type StageKind,
  type ExposureBand,
} from "@/lib/flying";
import { TRANSITION } from "@/lib/motion";

// --- Minimal ISO2 → name map (display only; falls back to the code) ----------
const NAMES: Record<string, string> = {
  AT: "Austria", AU: "Australia", BE: "Belgium", BR: "Brazil", CA: "Canada",
  CH: "Switzerland", CN: "China", CZ: "Czechia", DE: "Germany", DK: "Denmark",
  EG: "Egypt", ES: "Spain", FI: "Finland", FR: "France", GB: "United Kingdom",
  GR: "Greece", HK: "Hong Kong", HU: "Hungary", ID: "Indonesia", IE: "Ireland",
  IL: "Israel", IN: "India", IT: "Italy", JP: "Japan", KR: "South Korea",
  MX: "Mexico", MY: "Malaysia", NL: "Netherlands", NO: "Norway", NZ: "New Zealand",
  PL: "Poland", PT: "Portugal", QA: "Qatar", RU: "Russia", SA: "Saudi Arabia",
  SE: "Sweden", SG: "Singapore", TH: "Thailand", TR: "Türkiye", TW: "Taiwan",
  AE: "UAE", US: "United States", VN: "Vietnam", ZA: "South Africa",
};

function nameOf(iso2: string): string {
  return NAMES[iso2.toUpperCase()] ?? iso2.toUpperCase();
}

// --- Persistence -------------------------------------------------------------

const STORAGE_KEY = "greyline:flying-trail";

type Persisted = { origin: string; dest: string; layovers: string[] };

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return { origin: "", dest: "", layovers: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { origin: "", dest: "", layovers: [] };
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      origin: typeof p.origin === "string" ? p.origin : "",
      dest: typeof p.dest === "string" ? p.dest : "",
      layovers: Array.isArray(p.layovers)
        ? p.layovers.filter((x): x is string => typeof x === "string")
        : [],
    };
  } catch {
    return { origin: "", dest: "", layovers: [] };
  }
}

// --- Stage presentation ------------------------------------------------------

const STAGE_META: Record<
  StageKind,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  booking: { label: "Booking", icon: Ticket },
  departure: { label: "Check-in / departure", icon: PlaneTakeoff },
  arrival: { label: "Border / arrival", icon: Fingerprint },
};

const BAND_CLASS: Record<ExposureBand, string> = {
  Low: "text-primary",
  Moderate: "text-spark",
  High: "text-destructive",
};

// --- Country select ----------------------------------------------------------

function CountrySelect({
  value,
  onChange,
  coverage,
  label,
  id,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  coverage: string[];
  label: string;
  id: string;
  placeholder: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-[11px] text-faint">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <option value="">{placeholder}</option>
        {coverage.map((c) => (
          <option key={c} value={c}>
            {nameOf(c)} ({c})
          </option>
        ))}
      </select>
    </div>
  );
}

// --- Main component ----------------------------------------------------------

export function FlyingTrail() {
  const reduce = useReducedMotion();
  const [coverage, setCoverage] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [layovers, setLayovers] = useState<string[]>([]);
  const [intelByIso, setIntelByIso] = useState<Record<string, FlyingIntel | null>>({});
  const [hydrated, setHydrated] = useState(false);

  // Hydrate selections + load coverage list.
  useEffect(() => {
    const p = loadPersisted();
    setOrigin(p.origin);
    setDest(p.dest);
    setLayovers(p.layovers);
    setHydrated(true);

    let cancelled = false;
    fetch("/api/intel")
      .then((r) => r.json() as Promise<{ ok: boolean; coverage?: string[] }>)
      .then((d) => {
        if (cancelled) return;
        const list = Array.isArray(d.coverage) ? [...d.coverage].sort() : [];
        setCoverage(list);
      })
      .catch(() => {
        if (!cancelled) setCoverage([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist selections.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ origin, dest, layovers } satisfies Persisted),
    );
  }, [origin, dest, layovers, hydrated]);

  // Fetch intel for each distinct selected leg (cached in state).
  const legs = useMemo(
    () =>
      [...new Set([origin, ...layovers, dest].map((c) => c.toUpperCase()))].filter(
        (c) => c.length === 2,
      ),
    [origin, dest, layovers],
  );

  useEffect(() => {
    const missing = legs.filter((c) => !(c in intelByIso));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map((c) =>
        fetch(`/api/intel?iso2=${encodeURIComponent(c)}`)
          .then((r) => r.json() as Promise<{ ok: boolean; intel?: FlyingIntel | null }>)
          .then((d) => [c, d.ok ? (d.intel ?? null) : null] as const)
          .catch(() => [c, null] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      setIntelByIso((prev) => {
        const next = { ...prev };
        for (const [c, intel] of entries) next[c] = intel;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [legs, intelByIso]);

  const ready = origin.length === 2 && dest.length === 2;

  const trail = useMemo(
    () =>
      ready
        ? buildTrail({ originIso2: origin, destIso2: dest, layovers, intelByIso })
        : [],
    [ready, origin, dest, layovers, intelByIso],
  );

  const exposure = useMemo(
    () =>
      ready
        ? exposureScore({ originIso2: origin, destIso2: dest, layovers, intelByIso })
        : null,
    [ready, origin, dest, layovers, intelByIso],
  );

  const addLayover = () => setLayovers((prev) => [...prev, ""]);
  const removeLayover = (i: number) =>
    setLayovers((prev) => prev.filter((_, idx) => idx !== i));
  const updateLayover = (i: number, v: string) =>
    setLayovers((prev) => prev.map((c, idx) => (idx === i ? v : c)));

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-5 shadow-xs">
      <div>
        <h2 className="font-display text-foreground">Your data trail</h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">
          Pick your route and see, stage by stage, which authorities collect your
          data and how long they keep it. Everything is computed on this machine.
        </p>
      </div>

      {/* Route selectors */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <CountrySelect
            id="flying-origin"
            label="Origin country"
            placeholder="Where you depart…"
            value={origin}
            onChange={setOrigin}
            coverage={coverage}
          />
          <CountrySelect
            id="flying-dest"
            label="Destination country"
            placeholder="Where you arrive…"
            value={dest}
            onChange={setDest}
            coverage={coverage}
          />
        </div>

        {layovers.map((c, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <CountrySelect
              id={`flying-layover-${i}`}
              label={`Layover ${i + 1}`}
              placeholder="Transit country…"
              value={c}
              onChange={(v) => updateLayover(i, v)}
              coverage={coverage}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLayover(i)}
              aria-label={`Remove layover ${i + 1}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <X />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addLayover}>
          <Plus />
          Add layover
        </Button>
      </div>

      {!ready ? (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-accent-subtle p-3.5 text-xs text-accent-text">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>Choose an origin and destination to generate your data trail.</span>
        </p>
      ) : (
        <>
          {/* Exposure score */}
          {exposure && (
            <motion.div
              key={`${exposure.score}-${exposure.band}`}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={TRANSITION.snap}
              className="rounded-xl border border-border bg-accent-subtle p-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                  <Gauge className={cn("size-5", BAND_CLASS[exposure.band])} />
                  <span
                    className={cn(
                      "font-mono text-2xl font-semibold tabular-nums",
                      BAND_CLASS[exposure.band],
                    )}
                  >
                    {exposure.score.toFixed(1)}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("font-medium", BAND_CLASS[exposure.band])}
                  >
                    {exposure.band} exposure
                  </Badge>
                </div>
                {exposure.highestRiskLeg && (
                  <span className="text-xs text-muted-foreground">
                    Highest-risk leg:{" "}
                    <span className="font-medium text-foreground">
                      {nameOf(exposure.highestRiskLeg)}
                    </span>
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Combines the number of jurisdictions on your route with each
                country&apos;s travel-advisory level and civil-liberties (freedom)
                status. Higher means more authorities collect more of your data,
                in places with weaker oversight.
              </p>
            </motion.div>
          )}

          {/* Timeline */}
          <ol className="relative space-y-3 before:absolute before:left-[18px] before:top-2 before:bottom-2 before:w-px before:bg-border">
            {trail.map((node, i) => {
              const meta = STAGE_META[node.stage];
              const Icon = meta.icon;
              return (
                <motion.li
                  key={`${node.stage}-${node.country}-${i}`}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    ...TRANSITION.default,
                    delay: reduce ? 0 : Math.min(i, 12) * 0.03,
                  }}
                  className="relative flex gap-3 pl-0"
                >
                  <span className="z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card shadow-xs">
                    <Icon className="size-4 text-accent-text" />
                  </span>
                  <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-3.5 shadow-xs">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-faint">
                        {meta.label}
                      </span>
                      <span className="font-display text-sm text-foreground">
                        {nameOf(node.country)}
                      </span>
                      <Badge variant="outline" className="font-mono text-faint">
                        {node.country}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {node.authority}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {node.dataCollected.map((d, di) => (
                        <li
                          key={di}
                          className="flex items-start gap-2 text-xs text-foreground"
                        >
                          <span
                            className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground"
                            aria-hidden
                          />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                    {node.retention && (
                      <p className="mt-2 text-xs text-spark">{node.retention}</p>
                    )}
                    {node.note && (
                      <p className="mt-2 text-xs text-muted-foreground text-pretty">
                        {node.note}
                      </p>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </>
      )}

      <p className="flex items-start gap-2 text-[11px] text-faint">
        <Info className="mt-0.5 size-3 shrink-0" />
        <span>
          Information, not advice. Retention and biometric facts cite the EU PNR
          Directive (EU) 2016/681, the EU Entry/Exit System (EES) &amp; ETIAS, and
          the US CBP biometric entry/exit program. Rules change — verify before you
          fly.
        </span>
      </p>
    </section>
  );
}
