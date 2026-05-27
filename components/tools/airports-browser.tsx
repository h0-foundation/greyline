"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Search, PlaneTakeoff, MapPin, Mountain, Navigation, Car, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PlacePicker, type Place } from "@/components/tools/place-picker";
import { TRANSITION } from "@/lib/motion";

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

type NearbyAirport = Airport & {
  distance_km: number;
  bearing_deg: number;
  est_drive_min: number;
};

type NearestResponse = {
  ok: boolean;
  airports: NearbyAirport[];
  dispersion_deg: number;
  egress_flag: boolean;
  egress_note: string | null;
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

const COMPASS_16 = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

function compass(deg: number): string {
  const idx = Math.round(deg / 22.5) % 16;
  return COMPASS_16[idx] ?? "N";
}

function driveTime(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function AirportsBrowser() {
  const [mode, setMode] = useState<"planner" | "search">("planner");

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg border border-border bg-card p-0.5 shadow-xs">
        <ModeTab active={mode === "planner"} onClick={() => setMode("planner")}>
          Nearest &amp; alternates
        </ModeTab>
        <ModeTab active={mode === "search"} onClick={() => setMode("search")}>
          Search
        </ModeTab>
      </div>

      {mode === "planner" ? <NearestPlanner /> : <AirportSearch />}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-accent-subtle text-accent-text" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function NearestPlanner() {
  const reduce = useReducedMotion();
  const [place, setPlace] = useState<Place | null>(null);
  const [data, setData] = useState<NearestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!place) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/airports/nearest?lat=${place.lat}&lng=${place.lng}&limit=8`)
      .then((r) => r.json() as Promise<NearestResponse>)
      .then((d) => {
        if (cancelled) return;
        if (d.ok) setData(d);
        else setError("Could not find nearby airports.");
      })
      .catch(() => {
        if (!cancelled) setError("Could not find nearby airports.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [place]);

  return (
    <div className="space-y-5">
      <PlacePicker value={place} onSelect={setPlace} placeholder="Pick a place to plan around…" />

      {!place ? (
        <EmptyState
          icon={Navigation}
          title="Plan your air egress"
          description="Pick a place above. We rank the nearest scheduled-service airports by great-circle distance, with bearing, size, elevation, and an estimated drive time."
        />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={PlaneTakeoff} title="Lookup failed" description={error} />
      ) : !data || data.airports.length === 0 ? (
        <EmptyState
          icon={PlaneTakeoff}
          title="No scheduled-service airports nearby"
          description="Nothing with scheduled service within roughly 330 km of this point."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{data.airports.length}</span> nearest
              from <span className="text-foreground">{place.label}</span>
            </span>
            <span className="font-mono text-xs text-faint tabular-nums">
              egress spread {data.dispersion_deg}°
            </span>
          </div>

          {data.egress_flag && (
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-accent-subtle p-3 text-sm text-accent-text">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-medium">Limited overland egress.</span>{" "}
                {data.egress_note ?? "Alternates are clustered in one direction."}
              </span>
            </div>
          )}

          <ul className="space-y-3">
            {data.airports.map((a, i) => (
              <motion.li
                key={a.ident}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  ...TRANSITION.default,
                  delay: reduce ? 0 : Math.min(i, 12) * 0.015,
                }}
                className="rounded-xl border border-border bg-card p-3.5 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{a.name}</span>
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
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <Navigation className="size-3" />
                    {a.distance_km.toLocaleString()} km
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    {compass(a.bearing_deg)} · {Math.round(a.bearing_deg)}°
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Car className="size-3" />
                    {driveTime(a.est_drive_min)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Mountain className="size-3" />
                    {a.elevation_ft != null ? `${a.elevation_ft.toLocaleString()} ft` : "—"}
                  </span>
                </div>
              </motion.li>
            ))}
          </ul>
          <p className="text-xs text-faint">
            Drive time is a rough estimate (great-circle distance × 1.35 at ~60 km/h) — not a routed
            figure. Confirm overland routes locally.
          </p>
        </div>
      )}
    </div>
  );
}

function AirportSearch() {
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
                ...TRANSITION.default,
                delay: reduce ? 0 : Math.min(i, 12) * 0.015,
              }}
              className="rounded-xl border border-border bg-card p-3.5 shadow-xs"
            >
              <div className="flex items-start gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{a.name}</span>
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
