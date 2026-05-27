"use client";

import { THREAT, TONE_CLASS, type ThreatLevel } from "@/lib/intel";
import { cn } from "@/lib/utils";

const ORDER: ThreatLevel[] = ["routine", "elevated", "high", "extreme"];
const SEG_BG: Record<ThreatLevel, string> = {
  routine: "bg-success",
  elevated: "bg-warning",
  high: "bg-warning",
  extreme: "bg-destructive",
};

/** Accessible threat meter: numeric index + text label + lightness-separated
 *  segments (never color alone). role="meter" for AT. Optional onChange makes it
 *  an interactive radio-group-style selector. */
export function ThreatDial({
  level,
  onChange,
  suggested,
}: {
  level: ThreatLevel;
  onChange?: (l: ThreatLevel) => void;
  suggested?: ThreatLevel;
}) {
  const current = THREAT[level];
  const interactive = !!onChange;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-faint">Threat level</span>
        <span className={cn("font-display text-sm font-semibold", TONE_CLASS[current.tone])}>
          {current.index + 1}/4 · {current.label}
        </span>
      </div>
      <div
        role="meter"
        aria-valuemin={1}
        aria-valuemax={4}
        aria-valuenow={current.index + 1}
        aria-label={`Threat level: ${current.label}, ${current.index + 1} of 4`}
        className="grid grid-cols-4 gap-1"
      >
        {ORDER.map((l) => {
          const active = THREAT[l].index <= current.index;
          const segment = (
            <span
              className={cn(
                "h-2 rounded-full transition-colors",
                active ? SEG_BG[level] : "bg-muted",
              )}
            />
          );
          return interactive ? (
            <button
              key={l}
              type="button"
              onClick={() => onChange!(l)}
              aria-pressed={level === l}
              className="group flex flex-col gap-1 rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {segment}
              <span className={cn("text-[10px]", level === l ? "font-medium text-foreground" : "text-faint")}>
                {THREAT[l].label}
              </span>
            </button>
          ) : (
            <div key={l} className="flex flex-col gap-1">
              {segment}
            </div>
          );
        })}
      </div>
      {suggested && suggested !== level && (
        <p className="mt-2 text-xs text-faint">
          Suggested from country intel: <span className="font-medium text-muted-foreground">{THREAT[suggested].label}</span>
        </p>
      )}
    </div>
  );
}
