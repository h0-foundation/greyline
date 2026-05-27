"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Search, Stamp, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { VISA_LABEL, TONE_CLASS, TONE_DOT } from "@/lib/intel";

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

export function VisaChecker({
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
                      duration: 0.22,
                      delay: reduce ? 0 : Math.min(i, 12) * 0.015,
                      ease: [0.16, 1, 0.3, 1],
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
