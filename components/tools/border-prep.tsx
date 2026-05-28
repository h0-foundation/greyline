"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Smartphone,
  Power,
  ShieldCheck,
  LogOut,
  Info,
  Gauge,
  ListChecks,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_CATEGORIES,
  borderPlan,
  type BorderIntel,
  type Phase,
  type ThreatLevel,
  type TravelerStatus,
} from "@/lib/border";
import { TRANSITION } from "@/lib/motion";

type CoverageItem = { iso2: string; name: string };

const STATUS_OPTIONS: { value: TravelerStatus; label: string }[] = [
  { value: "citizen", label: "Citizen" },
  { value: "perm_resident", label: "Permanent resident" },
  { value: "visa_holder", label: "Visa holder" },
  { value: "vwp_eta", label: "Visa-waiver / ETA" },
  { value: "none", label: "None of these" },
];

const THREAT_OPTIONS: { value: ThreatLevel; label: string }[] = [
  { value: "routine", label: "Routine" },
  { value: "elevated", label: "Elevated" },
  { value: "high", label: "High" },
  { value: "extreme", label: "Extreme" },
];

const PHASES: { key: Phase; label: string; icon: typeof Power }[] = [
  { key: "before", label: "Before you travel", icon: ShieldCheck },
  { key: "at", label: "At the crossing", icon: Power },
  { key: "after", label: "After crossing", icon: Smartphone },
];

const STORAGE_KEY = "greyline:border-prep";

type Persisted = { logout: Record<string, boolean> };

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return { logout: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { logout: {} };
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const logout: Record<string, boolean> = {};
    if (parsed.logout && typeof parsed.logout === "object") {
      for (const [k, v] of Object.entries(parsed.logout)) {
        if (typeof v === "boolean") logout[k] = v;
      }
    }
    return { logout };
  } catch {
    return { logout: {} };
  }
}

export function BorderPrep({ coverage }: { coverage: CoverageItem[] }) {
  const reduce = useReducedMotion();

  const [iso2, setIso2] = useState<string>(coverage[0]?.iso2 ?? "");
  const [status, setStatus] = useState<TravelerStatus>("citizen");
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>("routine");

  const [intel, setIntel] = useState<BorderIntel | null>(null);
  const [intelError, setIntelError] = useState(false);

  const [logout, setLogout] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the logout checklist from localStorage.
  useEffect(() => {
    setLogout(loadPersisted().logout);
    setHydrated(true);
  }, []);

  // Persist the logout checklist (no credentials — just which boxes are ticked).
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ logout } satisfies Persisted));
  }, [logout, hydrated]);

  // Fetch the selected country's intel posture.
  useEffect(() => {
    if (!iso2) {
      setIntel(null);
      return;
    }
    let cancelled = false;
    setIntelError(false);
    fetch(`/api/intel?iso2=${encodeURIComponent(iso2)}`)
      .then((r) => r.json() as Promise<{ ok: boolean; intel?: BorderIntel | null }>)
      .then((data) => {
        if (cancelled) return;
        setIntel(data.ok ? (data.intel ?? null) : null);
      })
      .catch(() => {
        if (cancelled) return;
        setIntel(null);
        setIntelError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [iso2]);

  // The scored intel — defaults to an all-null posture until/if data loads.
  const effectiveIntel: BorderIntel = intel ?? {
    decryption_compulsion: null,
    sim_registration: null,
    advisory_level: null,
  };

  const plan = useMemo(
    () => borderPlan({ intel: effectiveIntel, status, threatLevel }),
    [effectiveIntel, status, threatLevel],
  );

  const bandColor =
    plan.band === "Low"
      ? "text-primary"
      : plan.band === "Elevated"
        ? "text-spark"
        : "text-destructive";

  const countryName = coverage.find((c) => c.iso2 === iso2)?.name ?? iso2;

  return (
    <div className="space-y-8">
      {/* Inputs */}
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-xs sm:grid-cols-3">
        <Field label="Destination">
          <Select value={iso2} onValueChange={setIso2}>
            <SelectTrigger aria-label="Destination country">
              <SelectValue placeholder="Pick a country" />
            </SelectTrigger>
            <SelectContent>
              {coverage.map((c) => (
                <SelectItem key={c.iso2} value={c.iso2}>
                  {c.name}{" "}
                  <span className="font-mono text-faint">({c.iso2})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Your status">
          <Select value={status} onValueChange={(v) => setStatus(v as TravelerStatus)}>
            <SelectTrigger aria-label="Traveler status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Threat level">
          <Select value={threatLevel} onValueChange={(v) => setThreatLevel(v as ThreatLevel)}>
            <SelectTrigger aria-label="Threat level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THREAT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </section>

      {intelError && (
        <p className="text-xs text-spark">
          Could not load curated intel for {countryName}; scoring with a neutral
          baseline posture.
        </p>
      )}

      {/* Exposure score */}
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl bg-accent-subtle text-accent-text">
            <Gauge className="size-6" />
          </span>
          <div>
            <p className="label-caps text-faint">Border exposure score</p>
            <p className="text-sm text-muted-foreground">
              {countryName} · {STATUS_OPTIONS.find((s) => s.value === status)?.label}
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <motion.span
            key={plan.score}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={TRANSITION.snap}
            className={cn("font-mono text-5xl font-semibold tabular-nums", bandColor)}
          >
            {plan.score}
          </motion.span>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-faint">/ 100</span>
            <Badge variant="outline" className={cn("font-medium", bandColor)}>
              {plan.band}
            </Badge>
          </div>
        </div>
      </section>

      {/* Phase-grouped action plan */}
      <div className="grid gap-5 lg:grid-cols-3">
        {PHASES.map((phase) => {
          const items = plan.actions.filter((a) => a.phase === phase.key);
          return (
            <section
              key={phase.key}
              className="rounded-xl border border-border bg-card p-5 shadow-xs"
            >
              <div className="mb-3 flex items-center gap-2">
                <phase.icon className="size-4 text-accent-text" />
                <h3 className="text-sm font-semibold text-foreground">{phase.label}</h3>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-faint">No specific actions for this phase.</p>
              ) : (
                <ul className="space-y-3">
                  {items.map((a, i) => (
                    <motion.li
                      key={a.text}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        ...TRANSITION.snap,
                        delay: reduce ? 0 : Math.min(i, 8) * 0.03,
                      }}
                    >
                      <p className="text-sm text-foreground">{a.text}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.reason}</p>
                    </motion.li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* Account-logout checklist */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="mb-1 flex items-center gap-2">
          <LogOut className="size-4 text-accent-text" />
          <h3 className="text-sm font-semibold text-foreground">Account sign-out checklist</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Sign out of and revoke session tokens for sensitive accounts before the
          crossing so a device search exposes less. Ticks persist on this machine
          only — no account details are stored.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ACCOUNT_CATEGORIES.map((cat) => {
            const checked = logout[cat] ?? false;
            return (
              <li
                key={cat}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
              >
                <span
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    checked ? "text-faint line-through" : "text-foreground",
                  )}
                >
                  <ListChecks className="size-4 text-faint" />
                  {cat}
                </span>
                <Switch
                  checked={checked}
                  onCheckedChange={(v) =>
                    setLogout((prev) => ({ ...prev, [cat]: v }))
                  }
                  aria-label={`Signed out of ${cat}`}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <p className="flex items-start gap-2 text-xs text-faint">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Information, not legal advice. Device-search powers and your rights vary
          by country and your traveler status. Adapted from the EFF&rsquo;s{" "}
          <a
            href="https://www.eff.org/wp/digital-privacy-us-border-2017"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-text underline underline-offset-2"
          >
            Digital Privacy at the U.S. Border
          </a>{" "}
          guidance — confirm the rules for your destination before you travel.
        </span>
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-faint">{label}</label>
      {children}
    </div>
  );
}
