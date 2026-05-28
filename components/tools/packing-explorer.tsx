"use client";

// Generic template browser for /tools/packing. Filter by climate / activity /
// threat tier and grouped by category. Read-only view — the persistent list
// is on a trip.

import { useMemo, useState } from "react";
import { ExternalLink, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PackingTemplate } from "$server/db/repositories/templates";

const CATEGORY_LABEL: Record<string, string> = {
  documents: "Documents",
  money: "Money",
  electronics: "Electronics",
  opsec: "OPSEC gear",
  clothing: "Clothing",
  health: "Health",
  ground: "Ground & bags",
  specialty: "Specialty",
};

const CLIMATES = ["cold", "temperate", "hot", "humid", "tropical", "rain"];
const ACTIVITIES = ["urban", "business", "hike", "beach", "winter"];
const TIERS = [
  { v: 0, l: "Routine" }, { v: 1, l: "Elevated" }, { v: 2, l: "High" }, { v: 3, l: "Extreme" },
];

export function PackingExplorer({ templates }: { templates: PackingTemplate[] }) {
  const [climates, setClimates] = useState<Set<string>>(new Set());
  const [activities, setActivities] = useState<Set<string>>(new Set());
  const [tier, setTier] = useState(3); // show everything by default

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (t.threat_tier_min > tier) return false;
      if (climates.size && t.climate_tags.length && !t.climate_tags.some((c) => climates.has(c))) return false;
      if (activities.size && t.activity_tags.length && !t.activity_tags.some((a) => activities.has(a))) return false;
      return true;
    });
  }, [templates, climates, activities, tier]);

  const grouped = useMemo(() => {
    const m = new Map<string, PackingTemplate[]>();
    for (const t of filtered) {
      const arr = m.get(t.category) ?? [];
      arr.push(t);
      m.set(t.category, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.sort_order - b.sort_order);
    const order = ["documents","money","electronics","opsec","clothing","health","ground","specialty"];
    return order.filter((c) => m.has(c)).map((c) => ({ category: c, items: m.get(c)! }));
  }, [filtered]);

  function toggleSet(set: Set<string>, v: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(v)) next.delete(v); else next.add(v);
    setter(next);
  }

  return (
    <div className="space-y-5">
      {/* Filter row */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <p className="label-caps text-faint inline-flex items-center gap-1.5"><Filter className="size-3" /> Filter</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-faint mr-1.5">Climate</span>
          {CLIMATES.map((c) => (
            <button
              key={c}
              onClick={() => toggleSet(climates, c, setClimates)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-[var(--duration-snap)]",
                climates.has(c)
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-faint mr-1.5">Activity</span>
          {ACTIVITIES.map((a) => (
            <button
              key={a}
              onClick={() => toggleSet(activities, a, setActivities)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-[var(--duration-snap)]",
                activities.has(a)
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-faint mr-1.5">Tier ≤</span>
          {TIERS.map((t) => (
            <button
              key={t.v}
              onClick={() => setTier(t.v)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-[var(--duration-snap)]",
                tier === t.v
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {t.l}
            </button>
          ))}
        </div>
        <p className="font-mono text-xs text-faint tabular-nums">
          showing {filtered.length} of {templates.length}
        </p>
      </div>

      {grouped.map((g) => (
        <section key={g.category} className="rounded-xl border border-border bg-card p-5 surface-raised">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">
            {CATEGORY_LABEL[g.category] ?? g.category}
            <span className="ml-2 font-mono text-faint">{g.items.length}</span>
          </h3>
          <ul className="mt-3 space-y-2.5">
            {g.items.map((it) => (
              <li key={it.id} className="flex items-start gap-3">
                <span aria-hidden className="mt-1.5 inline-block size-1.5 rounded-full bg-accent-text shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-sm text-foreground">{it.label}</span>
                    {it.threat_tier_min > 0 && (
                      <Badge variant="outline" className="font-mono text-[10px]">tier ≥ {it.threat_tier_min}</Badge>
                    )}
                    {it.climate_tags.map((c) => (
                      <Badge key={c} variant="secondary" className="font-mono text-[10px]">{c}</Badge>
                    ))}
                    {it.activity_tags.map((a) => (
                      <Badge key={a} variant="secondary" className="font-mono text-[10px]">{a}</Badge>
                    ))}
                    {it.iso2 && (
                      <Badge variant="outline" className="font-mono text-[10px]">{it.iso2}</Badge>
                    )}
                  </div>
                  {it.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{it.description}</p>
                  )}
                </div>
                {it.source_url && (
                  <a
                    href={it.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-faint hover:text-accent-text"
                    aria-label="Source"
                    title="Source"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
