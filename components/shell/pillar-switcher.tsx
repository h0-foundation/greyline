"use client";

import { Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PILLARS, isPillarMode, type PillarMode } from "@/lib/pillars";
import { usePillarMode } from "@/components/shell/pillar-mode";

// Focus the workbench on one pillar (or All). Persists via /api/settings.
export function PillarSwitcher() {
  const { mode, setMode } = usePillarMode();
  return (
    <Select value={mode} onValueChange={(v) => isPillarMode(v) && setMode(v as PillarMode)}>
      <SelectTrigger
        size="sm"
        aria-label="Focus mode"
        className="h-9 gap-1.5 border-input bg-muted/50 text-muted-foreground hover:bg-muted"
      >
        <Layers className="size-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {PILLARS.map((p) => (
          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
