"use client";

// Auto-generated documents checklist. Same persistence pattern as TripPacking
// but a separate checklist row (type='documents'). Grouped by category.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileBadge } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { DocsGroup } from "@/lib/trip-kit";

type StoredItem = { id: string; label: string; checked: boolean };

const CATEGORY_LABEL: Record<string, string> = {
  visa: "Visa & entry",
  health: "Health",
  driving: "Driving",
  insurance: "Insurance",
  proof_of_funds: "Proof of funds",
  customs: "Customs",
  other: "Other",
};

export function TripDocuments({
  tripId,
  groups,
  checklistId,
  storedItems,
}: {
  tripId: string;
  groups: DocsGroup[];
  checklistId: string | null;
  storedItems: StoredItem[];
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>(
    () => Object.fromEntries(storedItems.map((s) => [s.id, s.checked])),
  );

  const flat = groups.flatMap((g) => g.items);
  const total = flat.length;
  const done = flat.filter((it) => checked[it.id]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  async function persist(next: Record<string, boolean>) {
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
        body: JSON.stringify({ type: "documents", name: "Documents needed", items }),
      });
      router.refresh();
    }
  }

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    void persist(next);
  }

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">No document requirements for this trip yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <p className="label-caps text-faint inline-flex items-center gap-1.5">
          <FileBadge className="size-3" />
          Documents
        </p>
        <p className="font-mono text-sm tabular-nums">
          <span className="text-foreground">{done}</span>
          <span className="text-faint"> / {total} · {pct}%</span>
        </p>
        <div className="flex-1 min-w-32">
          <Progress value={pct} />
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.category} className="rounded-xl border border-border bg-card p-4 surface-raised">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-faint">
            {CATEGORY_LABEL[g.category] ?? g.category}
            <span className="ml-2 font-mono text-faint">
              {g.items.filter((it) => checked[it.id]).length}/{g.items.length}
            </span>
          </h4>
          <ul className="mt-3 space-y-2.5">
            {g.items.map((it) => {
              const isChecked = !!checked[it.id];
              return (
                <li key={it.id} className="flex items-start gap-3">
                  <Checkbox
                    id={`doc-${it.id}`}
                    checked={isChecked}
                    onCheckedChange={() => toggle(it.id)}
                    className="mt-0.5"
                  />
                  <label htmlFor={`doc-${it.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isChecked ? "text-faint line-through" : "text-foreground"}`}>
                        {it.label}
                      </span>
                      {it.iso2 && (
                        <Badge variant="outline" className="font-mono text-[10px]">{it.iso2}</Badge>
                      )}
                    </div>
                    {it.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{it.description}</p>
                    )}
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-faint">
                      {it.fee && <span>fee · <span className="text-foreground">{it.fee}</span></span>}
                      {it.processing && <span>processing · <span className="text-foreground">{it.processing}</span></span>}
                      {it.when_required && <span>{it.when_required}</span>}
                    </div>
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
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
