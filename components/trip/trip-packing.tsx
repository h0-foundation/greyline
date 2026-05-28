"use client";

// Trip-aware packing list. Server hands in the categorized template groups +
// a pre-existing checklist (if any). We persist check-state via the existing
// /api/trips/[id]/checklists endpoints, identifying our row by type='packing'.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ListChecks, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { PackingGroup, PackingItem } from "@/lib/trip-kit";

type StoredItem = { id: string; label: string; checked: boolean };

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

export function TripPacking({
  tripId,
  groups,
  checklistId,
  storedItems,
}: {
  tripId: string;
  groups: PackingGroup[];
  checklistId: string | null;
  storedItems: StoredItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const storedById = new Map(storedItems.map((s) => [s.id, s]));
  const [checked, setChecked] = useState<Record<string, boolean>>(
    () => Object.fromEntries(storedItems.map((s) => [s.id, s.checked])),
  );

  const flat: PackingItem[] = groups.flatMap((g) => g.items);
  const total = flat.length;
  const done = flat.filter((it) => checked[it.id]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  async function persist(next: Record<string, boolean>) {
    // Build items in the canonical order so the row reads sensibly on disk.
    const items = flat.map((it) => ({
      id: it.id,
      label: it.label,
      checked: !!next[it.id],
    }));
    if (checklistId) {
      await fetch(`/api/checklists/${checklistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } else {
      await fetch(`/api/trips/${tripId}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "packing", name: "Packing list", items }),
      });
      // Refresh so we pick up the new checklist id on the next render.
      startTransition(() => router.refresh());
    }
  }

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    void persist(next);
  }

  function resetAll() {
    const next: Record<string, boolean> = {};
    setChecked(next);
    void persist(next);
  }

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <p className="label-caps text-faint inline-flex items-center gap-1.5">
          <ListChecks className="size-3" />
          Packing
        </p>
        <p className="font-mono text-sm tabular-nums">
          <span className="text-foreground">{done}</span>
          <span className="text-faint"> / </span>
          <span className="text-foreground">{total}</span>
          <span className="text-faint"> · {pct}%</span>
        </p>
        <div className="flex-1 min-w-32">
          <Progress value={pct} />
        </div>
        {done > 0 && (
          <Button variant="ghost" size="sm" onClick={resetAll} disabled={pending}>
            <RotateCcw className="size-3.5" /> Reset
          </Button>
        )}
      </div>

      {groups.map((g) => (
        <section key={g.category} className="rounded-xl border border-border bg-card p-4 surface-raised">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-faint">
            {CATEGORY_LABEL[g.category] ?? g.category}
            <span className="ml-2 font-mono text-faint">
              {g.items.filter((it) => checked[it.id]).length}/{g.items.length}
            </span>
          </h4>
          <ul className="mt-3 space-y-2">
            {g.items.map((it) => {
              const wasStored = storedById.has(it.id);
              const isChecked = !!checked[it.id];
              return (
                <li key={it.id} className="flex items-start gap-3">
                  <Checkbox
                    id={`pk-${it.id}`}
                    checked={isChecked}
                    onCheckedChange={() => toggle(it.id)}
                    className="mt-0.5"
                  />
                  <label htmlFor={`pk-${it.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className={`text-sm ${isChecked ? "text-faint line-through" : "text-foreground"}`}>
                      {it.label}
                    </span>
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wide text-faint">
                      {it.rationale}
                    </span>
                    {it.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{it.description}</p>
                    )}
                  </label>
                  {it.source_url && (
                    <a
                      href={it.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-faint hover:text-accent-text"
                      aria-label="Source"
                      title="Source"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                  {!wasStored && checked[it.id] && (
                    // Visual hint: this item wasn't in the stored set yet.
                    <span aria-hidden className="text-[10px] text-faint">new</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
