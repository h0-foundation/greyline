"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Search, Globe, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { TRANSITION } from "@/lib/motion";
import {
  formatPopulation,
  sortRegions,
  type CountryListItem,
} from "@/lib/countries";

export type AdvisorySummary = { level: number; label: string; sources: number };

const ADVISORY_TONE: Record<number, { dot: string; text: string; ring: string; chipBg: string; chipText: string; tip: string }> = {
  1: { dot: "bg-success",       text: "text-success",      ring: "ring-success/30",       chipBg: "bg-success/10",     chipText: "text-success",     tip: "Normal precautions" },
  2: { dot: "bg-warning",       text: "text-warning",      ring: "ring-warning/30",       chipBg: "bg-warning/10",     chipText: "text-warning",     tip: "Increased caution" },
  3: { dot: "bg-accent-text",   text: "text-accent-text",  ring: "ring-accent-text/30",   chipBg: "bg-accent-text/10", chipText: "text-accent-text", tip: "Reconsider travel" },
  4: { dot: "bg-destructive",   text: "text-destructive",  ring: "ring-destructive/40",   chipBg: "bg-destructive/10", chipText: "text-destructive", tip: "Do not travel" },
};

export function CountriesBrowser({
  countries,
  advisories,
}: {
  countries: CountryListItem[];
  advisories?: Record<string, AdvisorySummary>;
}) {
  const reduce = useReducedMotion();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string>("All");
  const [minLevel, setMinLevel] = useState<number>(0); // 0=Any, else show ≥N

  // Honour ?advisory=N for deep-linking from /tools and elsewhere.
  useEffect(() => {
    const param = searchParams.get("advisory");
    if (!param) return;
    const n = Number(param);
    if (n >= 2 && n <= 4) setMinLevel(n);
  }, [searchParams]);

  const regions = useMemo(
    () => ["All", ...sortRegions([...new Set(countries.map((c) => c.region))])],
    [countries],
  );

  const advisoryMap = advisories ?? {};
  const hasAdvisoryData = Object.keys(advisoryMap).length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return countries.filter((c) => {
      if (region !== "All" && c.region !== region) return false;
      if (minLevel > 0) {
        const lvl = advisoryMap[c.code]?.level ?? 0;
        if (lvl < minLevel) return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.official.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.subregion.toLowerCase().includes(q)
      );
    });
  }, [countries, query, region, minLevel, advisoryMap]);

  // Sort: when filtering by advisory level, surface the riskiest first.
  const ordered = useMemo(() => {
    if (minLevel === 0) return filtered;
    return [...filtered].sort((a, b) => {
      const la = advisoryMap[a.code]?.level ?? 0;
      const lb = advisoryMap[b.code]?.level ?? 0;
      if (lb !== la) return lb - la;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, minLevel, advisoryMap]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search countries…"
            className="pl-9"
            aria-label="Search countries"
          />
        </div>
        <span className="font-mono text-xs text-faint tabular-nums">
          {ordered.length} of {countries.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {regions.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRegion(r)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-[var(--duration-snap)]",
              region === r
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {hasAdvisoryData && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label-caps text-faint mr-1.5 inline-flex items-center gap-1">
            <ShieldAlert className="size-3" />
            Advisory
          </span>
          {[
            { v: 0, label: "Any" },
            { v: 2, label: "≥ Caution", tone: 2 },
            { v: 3, label: "≥ Reconsider", tone: 3 },
            { v: 4, label: "Do not travel", tone: 4 },
          ].map((opt) => {
            const t = opt.tone ? ADVISORY_TONE[opt.tone] : null;
            const active = minLevel === opt.v;
            return (
              <button
                key={opt.v}
                type="button"
                onClick={() => setMinLevel(opt.v)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-[var(--duration-snap)]",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {t && <span className={cn("inline-block size-2 rounded-full", t.dot)} aria-hidden />}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {ordered.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No countries match"
          description="Try a different name, code, region, or advisory filter."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((c, i) => {
            const adv = advisoryMap[c.code];
            const tone = adv ? ADVISORY_TONE[adv.level] : null;
            return (
              <motion.li
                key={c.code}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...TRANSITION.default, delay: reduce ? 0 : Math.min(i, 12) * 0.015 }}
              >
                <Link
                  href={`/countries/${c.code}`}
                  className={cn(
                    "surface-interactive group flex items-center gap-3 rounded-xl border bg-card p-3.5 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    tone ? `border-border ring-1 ring-inset ${tone.ring}` : "border-border",
                  )}
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {c.flag || "🏳️"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="block truncate font-medium text-foreground group-hover:text-accent-text">
                        {c.name}
                      </span>
                      {tone && (
                        <span
                          className={cn("inline-block size-2 rounded-full shrink-0", tone.dot)}
                          aria-label={`Advisory: ${tone.tip}`}
                          title={tone.tip}
                        />
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs">
                      <span className="truncate text-muted-foreground">
                        {c.subregion || c.region}
                      </span>
                      {adv && tone && (
                        <span className={cn("ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", tone.chipBg, tone.chipText)}>
                          L{adv.level}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="outline" className="font-mono">
                      {c.code}
                    </Badge>
                    <span className="font-mono text-[11px] text-faint tabular-nums">
                      {formatPopulation(c.population)}
                    </span>
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
