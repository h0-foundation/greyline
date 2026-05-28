"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, MapPin, Bookmark, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export type Place = { label: string; lat: number; lng: number; country?: string | null };

type GeoResult = { display_name?: string; name?: string; lat: string | number; lon: string | number };

const QUICK: Place[] = [
  { label: "London", lat: 51.5074, lng: -0.1278 },
  { label: "Paris", lat: 48.8566, lng: 2.3522 },
  { label: "Berlin", lat: 52.52, lng: 13.405 },
  { label: "New York", lat: 40.7128, lng: -74.006 },
  { label: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { label: "Dubai", lat: 25.2048, lng: 55.2708 },
  { label: "Mexico City", lat: 19.4326, lng: -99.1332 },
  { label: "Bangkok", lat: 13.7563, lng: 100.5018 },
];

/** Reusable destination selector for the field tools. Resolves a place name to
 *  coordinates three ways: live geocoding (needs the geocode connection), your
 *  saved trip destinations (offline), or quick-pick cities. */
export function PlacePicker({
  value,
  onSelect,
  placeholder = "Search a city or place…",
}: {
  value: Place | null;
  onSelect: (p: Place) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [saved, setSaved] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoOff, setGeoOff] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/places")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setSaved(d.places as Place[]); })
      .catch(() => {});
  }, []);

  const trimmed = query.trim();
  useEffect(() => {
    if (trimmed.length < 2) { setResults([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(() => {
      fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          if (d.ok && Array.isArray(d.results)) {
            setGeoOff(false);
            setResults(
              (d.results as GeoResult[]).slice(0, 6).map((r) => ({
                label: r.display_name ?? r.name ?? "Place",
                lat: Number(r.lat),
                lng: Number(r.lon),
              })),
            );
          } else {
            setGeoOff(Boolean(d.disabled));
            setResults([]);
          }
        })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [trimmed]);

  function choose(p: Place) {
    onSelect(p);
    setQuery("");
    setResults([]);
  }

  // Offline match against saved destinations + quick cities, for when geocoding is off.
  const localMatches = trimmed.length >= 2
    ? [...saved, ...QUICK].filter((p) => p.label.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="space-y-3" ref={boxRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-9"
          aria-label="Search a place"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-faint" />}
        {!loading && query && (
          <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-foreground" aria-label="Clear">
            <X className="size-4" />
          </button>
        )}

        {trimmed.length >= 2 && (results.length > 0 || localMatches.length > 0 || geoOff) && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            {(results.length ? results : localMatches).map((p, i) => (
              <button
                key={`${p.label}-${i}`}
                type="button"
                onClick={() => choose(p)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/60"
              >
                <MapPin className="size-3.5 shrink-0 text-faint" />
                <span className="truncate">{p.label}</span>
              </button>
            ))}
            {geoOff && localMatches.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Live search is off. Turn on the geocoding connection in{" "}
                <Link href="/settings" className="text-accent-text hover:underline">Settings</Link>, or pick a saved place below.
              </p>
            )}
          </div>
        )}
      </div>

      {saved.length > 0 && (
        <div className="space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs text-faint"><Bookmark className="size-3" /> Your destinations</span>
          <div className="flex flex-wrap gap-1.5">
            {saved.slice(0, 10).map((p, i) => (
              <Chip key={`s-${i}`} active={value?.label === p.label} onClick={() => choose(p)}>{p.label}</Chip>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <span className="text-xs text-faint">Quick pick</span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map((p) => (
            <Chip key={p.label} active={value?.label === p.label} onClick={() => choose(p)}>{p.label}</Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active ? "border-primary/40 bg-accent-subtle text-accent-text" : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
