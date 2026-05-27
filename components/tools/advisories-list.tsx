"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, AlertTriangle, PlugZap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "destructive" | "muted";

type Advisory = {
  code: string;
  name: string;
  score: number | null;
  level: string | null;
  message: string | null;
  source: string | null;
  tone: Tone;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function firstString(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function firstNumber(o: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

// Map a numeric score (typically 0–5) and/or a textual level to a display tone.
function toTone(score: number | null, level: string | null): Tone {
  if (level) {
    const l = level.toLowerCase();
    if (/(extreme|do not travel|level\s*4|reconsider|high)/.test(l)) return "destructive";
    if (/(increased|caution|medium|level\s*[23])/.test(l)) return "warning";
    if (/(normal|low|exercise normal|level\s*1)/.test(l)) return "success";
  }
  if (score !== null) {
    if (score >= 4) return "destructive";
    if (score >= 2.5) return "warning";
    if (score > 0) return "success";
  }
  return "muted";
}

function toneLabel(tone: Tone): string {
  switch (tone) {
    case "destructive":
      return "High";
    case "warning":
      return "Medium";
    case "success":
      return "Low";
    default:
      return "Unknown";
  }
}

const TONE_BADGE: Record<Tone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted text-muted-foreground",
};

// The advisories payload is a country-keyed map with a loosely-typed shape.
// Inspect each entry defensively for a score, level, message, and name.
function parseAdvisories(data: unknown): Advisory[] {
  const map = asRecord(data);
  if (!map) return [];
  const out: Advisory[] = [];
  for (const [code, raw] of Object.entries(map)) {
    const entry = asRecord(raw);
    if (!entry) continue;
    const nested = asRecord(entry.advisory) ?? entry;
    const score = firstNumber(nested, ["score", "level", "advisory_score"]);
    const level =
      firstString(nested, ["level", "advisory_level", "category", "label"]) ??
      firstString(entry, ["level", "advisory_level"]);
    const message =
      firstString(nested, ["message", "text", "summary", "description"]) ?? null;
    const name =
      firstString(entry, ["name", "country", "country_name"]) ?? code.toUpperCase();
    const source =
      firstString(nested, ["source", "updated"]) ?? firstString(entry, ["source"]);
    out.push({
      code: code.toUpperCase(),
      name,
      score,
      level,
      message,
      source,
      tone: toTone(score, level),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function AdvisoriesList() {
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/advisories");
        const data: unknown = await res.json();
        if (!active) return;
        const o = asRecord(data);
        if (res.status === 503 || (o && o.disabled === true)) {
          setDisabled(true);
          return;
        }
        if (!res.ok || !o || o.ok !== true) {
          setError(
            o && typeof o.error === "string" ? o.error : "Could not load advisories.",
          );
          return;
        }
        setAdvisories(parseAdvisories(o.advisories));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Request failed.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return advisories;
    return advisories.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        (a.message?.toLowerCase().includes(q) ?? false),
    );
  }, [advisories, query]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full max-w-sm rounded-md" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-6 shadow-xs">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent-subtle text-accent-text">
          <PlugZap className="size-5" />
        </span>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">
            Advisories connection is off
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Greyline isn&apos;t fetching travel advisories right now. Enable the connection
            in Settings to pull current government advisory levels.
          </p>
        </div>
        <Link
          href="/settings"
          className="text-sm font-medium text-accent-text hover:underline"
        >
          Open Settings →
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertTriangle className="size-4 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search countries…"
          className="pl-9"
          aria-label="Search countries"
        />
      </div>

      <p className="font-mono text-xs text-faint tabular-nums">
        {filtered.length} / {advisories.length} countries
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-xs">
          No countries match “{query}”.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((a) => (
            <li
              key={a.code}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{a.name}</p>
                  <p className="font-mono text-xs text-faint">{a.code}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("shrink-0", TONE_BADGE[a.tone])}
                >
                  {a.level ?? toneLabel(a.tone)}
                  {a.score !== null && (
                    <span className="ml-1 tabular-nums">{a.score.toFixed(1)}</span>
                  )}
                </Badge>
              </div>
              {a.message && (
                <p className="text-xs text-muted-foreground text-pretty">{a.message}</p>
              )}
              {a.source && (
                <p className="font-mono text-[11px] text-faint">{a.source}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
