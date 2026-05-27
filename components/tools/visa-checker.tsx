"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Search,
  Stamp,
  Info,
  CalendarRange,
  ShieldCheck,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { VISA_LABEL, TONE_CLASS, TONE_DOT } from "@/lib/intel";
import { TRANSITION } from "@/lib/motion";
import {
  epochDay,
  fromEpochDay,
  todayEpochDay,
  isSchengen,
  schengenStatus,
  passportValidity,
  type Stay,
} from "@/lib/visa";

type VisaRow = {
  passport_iso2: string;
  dest_iso2: string;
  requirement: string;
  detail: string | null;
};

// Display order: best (most permissive) to most restrictive.
const REQUIREMENT_ORDER = [
  "visa_free",
  "visa_on_arrival",
  "eta",
  "e_visa",
  "visa_required",
  "no_admission",
];

function labelFor(requirement: string) {
  return VISA_LABEL[requirement] ?? { label: requirement, tone: "neutral" as const };
}

function rank(requirement: string): number {
  const i = REQUIREMENT_ORDER.indexOf(requirement);
  return i === -1 ? 99 : i;
}

// --- Persistence -------------------------------------------------------------

const STORAGE_KEY = "greyline:visa-calc";

type StayRow = { entry: string; exit: string };
type PersistShape = { stays: StayRow[]; expiry: string };

function loadPersisted(): PersistShape {
  if (typeof window === "undefined") return { stays: [], expiry: "" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { stays: [], expiry: "" };
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    const stays = Array.isArray(parsed.stays)
      ? parsed.stays
          .filter((s): s is StayRow => !!s && typeof s.entry === "string" && typeof s.exit === "string")
          .map((s) => ({ entry: s.entry, exit: s.exit }))
      : [];
    return { stays, expiry: typeof parsed.expiry === "string" ? parsed.expiry : "" };
  } catch {
    return { stays: [], expiry: "" };
  }
}

// --- Schengen 90/180 calculator ----------------------------------------------

function SchengenCalculator() {
  const reduce = useReducedMotion();
  const [stays, setStays] = useState<StayRow[]>([]);
  const [queryDate, setQueryDate] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount; default the query date to today.
  useEffect(() => {
    setStays(loadPersisted().stays);
    setQueryDate(fromEpochDay(todayEpochDay()));
    setHydrated(true);
  }, []);

  // Persist stays (merge with the validity card's expiry so neither clobbers).
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const expiry = loadPersisted().expiry;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ stays, expiry }));
  }, [stays, hydrated]);

  const addStay = () => setStays((prev) => [...prev, { entry: "", exit: "" }]);
  const removeStay = (i: number) =>
    setStays((prev) => prev.filter((_, idx) => idx !== i));
  const updateStay = (i: number, patch: Partial<StayRow>) =>
    setStays((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  // Parse valid stays into epoch-day pairs (skip incomplete/incoherent rows).
  const parsed = useMemo<Stay[]>(() => {
    const out: Stay[] = [];
    for (const s of stays) {
      const entry = epochDay(s.entry);
      const exit = epochDay(s.exit);
      if (entry == null || exit == null || exit < entry) continue;
      out.push({ entry, exit });
    }
    return out;
  }, [stays]);

  const queryEpoch = useMemo(() => epochDay(queryDate), [queryDate]);

  const status = useMemo(() => {
    if (queryEpoch == null) return null;
    return schengenStatus(parsed, queryEpoch);
  }, [parsed, queryEpoch]);

  // Color band: ok / approaching / over.
  const band = status
    ? !status.compliant
      ? { tone: "over" as const, text: "text-destructive", bg: "bg-destructive/10 border-destructive/30" }
      : status.remaining <= 15
        ? { tone: "warn" as const, text: "text-spark", bg: "bg-spark/10 border-spark/30" }
        : { tone: "ok" as const, text: "text-primary", bg: "bg-primary/10 border-primary/30" }
    : null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="mb-1 flex items-center gap-2">
        <CalendarRange className="size-4 text-accent-text" />
        <h3 className="text-sm font-semibold text-foreground">Schengen 90/180 calculator</h3>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        No more than 90 days of presence in any rolling 180-day window across the
        Schengen area. Enter each past or planned stay — both endpoints count.
      </p>

      <div className="space-y-2.5">
        {stays.length === 0 && (
          <p className="text-xs text-faint">No stays yet — add your trips below.</p>
        )}
        {stays.map((s, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-[11px] text-faint">Entry</label>
              <Input
                type="date"
                value={s.entry}
                max={s.exit || undefined}
                onChange={(e) => updateStay(i, { entry: e.target.value })}
                aria-label={`Stay ${i + 1} entry date`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-[11px] text-faint">Exit</label>
              <Input
                type="date"
                value={s.exit}
                min={s.entry || undefined}
                onChange={(e) => updateStay(i, { exit: e.target.value })}
                aria-label={`Stay ${i + 1} exit date`}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeStay(i)}
              aria-label={`Remove stay ${i + 1}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <X />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addStay}>
          <Plus />
          Add stay
        </Button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:items-end">
        <div className="sm:max-w-[12rem]">
          <label className="mb-1 block text-[11px] text-faint">
            As of date (e.g. planned entry)
          </label>
          <Input
            type="date"
            value={queryDate}
            onChange={(e) => setQueryDate(e.target.value)}
            aria-label="Query date"
          />
        </div>
      </div>

      {band && status && (
        <motion.div
          key={`${status.used}-${status.windowEnd}`}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={TRANSITION.snap}
          className={cn("mt-5 rounded-xl border p-4", band.bg)}
        >
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <div className={cn("font-mono text-2xl font-semibold tabular-nums", band.text)}>
                {Math.max(status.used, 0)}
                <span className="text-sm font-normal text-muted-foreground"> / 90 days used</span>
              </div>
            </div>
            <div className="text-sm text-foreground">
              {status.compliant ? (
                <>
                  <span className="font-medium text-primary">{status.remaining}</span>{" "}
                  <span className="text-muted-foreground">days remaining</span>
                </>
              ) : (
                <span className="font-medium text-destructive">
                  Over by {Math.abs(status.remaining)} day
                  {Math.abs(status.remaining) === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>

          {/* Usage bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className={cn(
                "h-full rounded-full",
                band.tone === "over"
                  ? "bg-destructive"
                  : band.tone === "warn"
                    ? "bg-spark"
                    : "bg-primary",
              )}
              style={{ width: `${Math.min((Math.max(status.used, 0) / 90) * 100, 100)}%` }}
            />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Window {fromEpochDay(status.windowStart)} → {fromEpochDay(status.windowEnd)}.
            {!status.compliant &&
              (status.earliestReentry != null ? (
                <>
                  {" "}
                  Earliest compliant re-entry:{" "}
                  <span className="font-medium text-foreground">
                    {fromEpochDay(status.earliestReentry)}
                  </span>
                  .
                </>
              ) : (
                " Wait for older stays to age out of the window before re-entering."
              ))}
          </p>
        </motion.div>
      )}
    </section>
  );
}

// --- Passport validity checker -----------------------------------------------

function PassportValidityChecker({
  passports,
  names,
}: {
  passports: string[];
  names: Record<string, string>;
}) {
  const reduce = useReducedMotion();
  const [expiry, setExpiry] = useState("");
  const [entry, setEntry] = useState("");
  const [dest, setDest] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setExpiry(loadPersisted().expiry);
    setHydrated(true);
  }, []);

  // Persist expiry (merge with the Schengen card's stays).
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const stays = loadPersisted().stays;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ stays, expiry }));
  }, [expiry, hydrated]);

  const destCode = dest.trim().toUpperCase();
  const expiryEpoch = useMemo(() => epochDay(expiry), [expiry]);
  const entryEpoch = useMemo(() => epochDay(entry), [entry]);

  const result = useMemo(() => {
    if (expiryEpoch == null || entryEpoch == null) return null;
    return passportValidity({
      expiry: expiryEpoch,
      entry: entryEpoch,
      destIso2: destCode || null,
    });
  }, [expiryEpoch, entryEpoch, destCode]);

  const destName = names[destCode];

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="mb-1 flex items-center gap-2">
        <ShieldCheck className="size-4 text-accent-text" />
        <h3 className="text-sm font-semibold text-foreground">Passport validity check</h3>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Most countries require your passport to stay valid ≥ 6 months beyond entry.
        Schengen states require ≥ 3 months beyond your planned departure.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[11px] text-faint">Passport expiry</label>
          <Input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            aria-label="Passport expiry date"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-faint">Planned entry</label>
          <Input
            type="date"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            aria-label="Planned entry date"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-faint">Destination</label>
          <Input
            list="validity-dest-codes"
            value={dest}
            onChange={(e) => setDest(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="e.g. FR"
            maxLength={2}
            className="font-mono uppercase"
            aria-label="Destination country code"
          />
          <datalist id="validity-dest-codes">
            {passports.map((code) => (
              <option key={code} value={code}>
                {names[code] ?? code}
              </option>
            ))}
          </datalist>
        </div>
      </div>

      {result && expiryEpoch != null && (
        <motion.div
          key={`${result.ok}-${result.ruleMonths}-${result.requiredUntil}`}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={TRANSITION.snap}
          className={cn(
            "mt-5 rounded-xl border p-4",
            result.ok
              ? "border-primary/30 bg-primary/10"
              : "border-destructive/30 bg-destructive/10",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "font-medium",
                result.ok ? "text-primary" : "text-destructive",
              )}
            >
              {result.ok ? "Meets requirement" : "Insufficient validity"}
            </Badge>
            {isSchengen(destCode) && (
              <span className="text-xs text-muted-foreground">
                {destName ?? destCode} · Schengen 3-month rule
              </span>
            )}
          </div>
          <p className="mt-3 text-sm text-foreground">
            Passport must be valid until{" "}
            <span className="font-medium">{fromEpochDay(result.requiredUntil)}</span>{" "}
            <span className="text-muted-foreground">
              ({result.ruleMonths} months beyond entry)
            </span>
            . Yours expires {fromEpochDay(expiryEpoch)}.
          </p>
          {result.renewSoon && (
            <p className="mt-2 flex items-start gap-2 text-xs text-spark">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Expires within ~9 months. Routine renewals take 6–8 weeks and the
                6-month rule erodes usable validity early — renew soon.
              </span>
            </p>
          )}
        </motion.div>
      )}
    </section>
  );
}

// --- Top-level: calculators above the existing matrix ------------------------

export function VisaChecker(props: {
  passports: string[];
  names: Record<string, string>;
  initialPassport?: string;
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-5">
        <SchengenCalculator />
        <PassportValidityChecker passports={props.passports} names={props.names} />
        <p className="flex items-start gap-2 text-xs text-faint">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Calculators implement the EU 90/180 rule (EU Regulation 610/2013) and
            the general 6-month passport-validity rule. Always confirm against the
            destination&rsquo;s official source before travel.
          </span>
        </p>
      </div>
      <VisaMatrix {...props} />
    </div>
  );
}

function VisaMatrix({
  passports,
  names,
  initialPassport,
}: {
  passports: string[];
  names: Record<string, string>;
  initialPassport?: string;
}) {
  const reduce = useReducedMotion();
  const [passport, setPassport] = useState(initialPassport ?? "");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<VisaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passportName = (code: string) => names[code] ?? code;

  const selected = passport.trim().toUpperCase();
  const isValid = passports.includes(selected);

  useEffect(() => {
    if (!isValid) {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/visas?passport=${encodeURIComponent(selected)}`)
      .then((r) => r.json() as Promise<VisaRow[]>)
      .then((data) => {
        if (cancelled) return;
        setRows(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load visa requirements.");
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, isValid]);

  // Counts by requirement, in display order.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.requirement === "home") continue;
      map.set(r.requirement, (map.get(r.requirement) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
  }, [rows]);

  const filtered = useMemo(() => {
    const name = (code: string) => names[code] ?? code;
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => r.requirement !== "home")
      .filter((r) => {
        if (!q) return true;
        return (
          r.dest_iso2.toLowerCase().includes(q) ||
          name(r.dest_iso2).toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          rank(a.requirement) - rank(b.requirement) ||
          name(a.dest_iso2).localeCompare(name(b.dest_iso2)),
      );
  }, [rows, query, names]);

  return (
    <div className="space-y-5">
      <div className="w-full sm:max-w-xs">
        <label htmlFor="passport" className="mb-1.5 block text-xs text-faint">
          Your passport
        </label>
        <Input
          id="passport"
          list="passport-codes"
          value={passport}
          onChange={(e) => setPassport(e.target.value.toUpperCase().slice(0, 2))}
          placeholder="e.g. US"
          maxLength={2}
          className="font-mono uppercase"
          aria-label="Passport country code"
        />
        <datalist id="passport-codes">
          {passports.map((code) => (
            <option key={code} value={code}>
              {passportName(code)}
            </option>
          ))}
        </datalist>
        {passport.trim().length > 0 && !isValid && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            No matrix for “{selected}”. Pick a passport from the list.
          </p>
        )}
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-border bg-card p-3.5 text-xs text-muted-foreground shadow-xs">
        <Info className="mt-0.5 size-3.5 shrink-0 text-faint" />
        <span>
          Always verify passport validity (often 6 months) and onward-ticket rules
          before travel — not in this dataset.
        </span>
      </p>

      {!isValid ? (
        <EmptyState
          icon={Stamp}
          title="Pick your passport"
          description="Choose your passport country to see entry requirements for every destination on record."
        />
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-xl" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : error ? (
        <EmptyState icon={Stamp} title="Could not load" description={error} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {counts.map(([req, n]) => {
              const { label, tone } = labelFor(req);
              return (
                <span
                  key={req}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-xs"
                >
                  <span className={cn("size-2 rounded-full", TONE_DOT[tone])} aria-hidden />
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {n}
                  </span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </span>
              );
            })}
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search destinations…"
              className="pl-9"
              aria-label="Search destinations"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Stamp}
              title="No destinations match"
              description="Try a different country name or code."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filtered.map((r, i) => {
                const { label, tone } = labelFor(r.requirement);
                return (
                  <motion.li
                    key={r.dest_iso2}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      ...TRANSITION.default,
                      delay: reduce ? 0 : Math.min(i, 12) * 0.015,
                    }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-xs"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">
                        {passportName(r.dest_iso2)}
                      </span>
                      {r.detail && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.detail}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cn("text-xs font-medium", TONE_CLASS[tone])}>
                        {label}
                      </span>
                      <Badge variant="outline" className="font-mono text-faint">
                        {r.dest_iso2}
                      </Badge>
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
