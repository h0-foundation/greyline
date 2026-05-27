"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Search, PlaneTakeoff, MapPin, Mountain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

type Airport = {
  ident: string;
  type: string | null;
  name: string;
  lat: number | null;
  lng: number | null;
  elevation_ft: number | null;
  iso_country: string | null;
  iso_region: string | null;
  municipality: string | null;
  scheduled_service: number;
  iata_code: string | null;
  icao_code: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  large_airport: "Large",
  medium_airport: "Medium",
  small_airport: "Small",
  heliport: "Heliport",
  seaplane_base: "Seaplane",
  balloonport: "Balloonport",
  closed: "Closed",
};

function typeLabel(type: string | null): string {
  if (!type) return "Airport";
  return TYPE_LABEL[type] ?? type.replace(/_/g, " ");
}

function coords(a: Airport): string {
  if (a.lat == null || a.lng == null) return "—";
  return `${a.lat.toFixed(3)}, ${a.lng.toFixed(3)}`;
}

export function AirportsBrowser() {
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const handle = setTimeout(() => {
      fetch(`/api/airports?q=${encodeURIComponent(trimmed)}`)
        .then((r) => r.json() as Promise<Airport[]>)
        .then((data) => {
          if (cancelled) return;
          setResults(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (cancelled) return;
          setError("Could not search airports.");
          setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [trimmed]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, city, IATA, or ICAO…"
            className="pl-9"
            aria-label="Search airports"
          />
        </div>
        {trimmed.length >= 2 && !loading && (
          <span className="font-mono text-xs text-faint tabular-nums">
            {results.length} result{results.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
          ))}
        </div>
      ) : trimmed.length < 2 ? (
        <EmptyState
          icon={PlaneTakeoff}
          title="Search 85,000+ airports"
          description="Type at least two characters — an airport name, city, IATA (e.g. JFK), or ICAO (e.g. KJFK) code."
        />
      ) : error ? (
        <EmptyState icon={PlaneTakeoff} title="Search failed" description={error} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={PlaneTakeoff}
          title="No airports match"
          description="Try a different name, city, or code."
        />
      ) : (
        <ul className="space-y-3">
          {results.map((a, i) => (
            <motion.li
              key={a.ident}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.22,
                delay: reduce ? 0 : Math.min(i, 12) * 0.015,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="rounded-xl border border-border bg-card p-3.5 shadow-xs"
            >
              <div className="flex items-start gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">
                    {a.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {[a.municipality, a.iso_country].filter(Boolean).join(", ") || "—"}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="secondary">{typeLabel(a.type)}</Badge>
                  <span className="flex items-center gap-1">
                    {a.iata_code && (
                      <Badge variant="outline" className="font-mono">
                        {a.iata_code}
                      </Badge>
                    )}
                    {a.icao_code && (
                      <Badge variant="outline" className="font-mono text-faint">
                        {a.icao_code}
                      </Badge>
                    )}
                  </span>
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-faint tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3" />
                  {coords(a)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mountain className="size-3" />
                  {a.elevation_ft != null ? `${a.elevation_ft.toLocaleString()} ft` : "—"}
                </span>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
