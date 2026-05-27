"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type ChecklistSection = { title: string; items: string[] };

function itemId(sectionIndex: number, itemIndex: number): string {
  return `${sectionIndex}:${itemIndex}`;
}

export function ChecklistTool({
  toolKey,
  intro,
  sections,
}: {
  toolKey: string;
  intro?: string;
  sections: ChecklistSection[];
}) {
  const storageKey = `greyline:checklist:${toolKey}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore malformed / unavailable storage */
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(checked));
    } catch {
      /* ignore quota / unavailable storage */
    }
  }, [checked, hydrated, storageKey]);

  const totals = useMemo(() => {
    const total = sections.reduce((acc, s) => acc + s.items.length, 0);
    const done = Object.values(checked).filter(Boolean).length;
    return { total, done };
  }, [sections, checked]);

  const overallPct = totals.total === 0 ? 0 : Math.round((totals.done / totals.total) * 100);

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function reset() {
    setChecked({});
  }

  return (
    <div className="space-y-6">
      {intro && <p className="max-w-prose text-sm text-muted-foreground text-pretty">{intro}</p>}

      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">Progress</h2>
            <p className="font-mono text-sm text-foreground tabular-nums">
              {totals.done}/{totals.total}
              <span className="ml-2 text-faint">{overallPct}%</span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reset} disabled={totals.done === 0}>
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>
        <Progress value={overallPct} className="mt-4" />
      </div>

      <div className="space-y-4">
        {sections.map((section, si) => {
          const sectionTotal = section.items.length;
          const sectionDone = section.items.reduce(
            (acc, _item, ii) => acc + (checked[itemId(si, ii)] ? 1 : 0),
            0,
          );
          return (
            <section key={section.title} className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-display text-sm font-semibold text-foreground">{section.title}</h3>
                <span className="font-mono text-xs text-faint tabular-nums">
                  {sectionDone}/{sectionTotal}
                </span>
              </div>
              <ul className="space-y-1">
                {section.items.map((item, ii) => {
                  const id = itemId(si, ii);
                  const isChecked = Boolean(checked[id]);
                  return (
                    <li key={id}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent/50">
                        <Checkbox checked={isChecked} onCheckedChange={() => toggle(id)} className="mt-0.5" />
                        <span className={cn("text-sm", isChecked ? "text-faint line-through" : "text-foreground")}>
                          {item}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
