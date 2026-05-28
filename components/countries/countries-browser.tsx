"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Search, Globe } from "lucide-react";
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

export function CountriesBrowser({ countries }: { countries: CountryListItem[] }) {
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string>("All");

  const regions = useMemo(
    () => ["All", ...sortRegions([...new Set(countries.map((c) => c.region))])],
    [countries],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return countries.filter((c) => {
      if (region !== "All" && c.region !== region) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.official.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.subregion.toLowerCase().includes(q)
      );
    });
  }, [countries, query, region]);

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
          {filtered.length} of {countries.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {regions.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRegion(r)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              region === r
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No countries match"
          description="Try a different name, code, or region filter."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => (
            <motion.li
              key={c.code}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...TRANSITION.default, delay: reduce ? 0 : Math.min(i, 12) * 0.015 }}
            >
              <Link
                href={`/countries/${c.code}`}
                className="surface-interactive group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {c.flag || "🏳️"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground group-hover:text-accent-text">
                    {c.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {c.subregion || c.region}
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
          ))}
        </ul>
      )}
    </div>
  );
}
