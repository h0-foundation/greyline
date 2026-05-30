import { CheckCircle2, Circle, MinusCircle, ClipboardCheck } from "lucide-react";
import type { ItineraryReadiness, ReadinessCheck, Phase } from "@/lib/iso31030";
import { PHASE_LABEL } from "@/lib/iso31030";

/* ISO 31030 itinerary-readiness panel. Server component, no client JS. Readiness
 * is shown as a number + bar + word (redundant, CVD-safe cues) where HIGHER is
 * better (inverse of the risk score). Each check carries an icon + label so
 * status never relies on colour alone. */

function meterTone(score: number): { text: string; bar: string } {
  if (score >= 80) return { text: "text-success", bar: "bg-success" };
  if (score >= 50) return { text: "text-warning", bar: "bg-warning" };
  return { text: "text-destructive", bar: "bg-destructive" };
}

function StatusIcon({ check }: { check: ReadinessCheck }) {
  if (check.status === "done") return <CheckCircle2 className="size-4 shrink-0 text-success" />;
  if (check.status === "na") return <MinusCircle className="size-4 shrink-0 text-faint" />;
  const tone = check.phase === "before" ? "text-warning" : "text-faint";
  return <Circle className={`size-4 shrink-0 ${tone}`} />;
}

function CheckRow({ check }: { check: ReadinessCheck }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span className="mt-0.5">
        <StatusIcon check={check} />
      </span>
      <span className="min-w-0">
        <span className="text-foreground">{check.label}</span>
        {check.detail && <span className="ml-2 text-xs text-faint">{check.detail}</span>}
      </span>
    </li>
  );
}

const PHASES: Phase[] = ["before", "during", "after"];

export function ItineraryReadiness({ readiness }: { readiness: ItineraryReadiness }) {
  const { score, done, applicable, currentPhase } = readiness;
  const tone = score == null ? { text: "text-faint", bar: "bg-muted" } : meterTone(score);

  return (
    <div className="space-y-5">
      {/* Readiness meter */}
      <div className="flex items-end gap-4">
        <div>
          <div className={`font-display text-4xl font-semibold leading-none tabular-nums ${tone.text}`}>
            {score == null ? "—" : score}
            {score != null && <span className="text-xl text-faint">%</span>}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <ClipboardCheck className={`size-4 ${tone.text}`} />
            <span className={`text-sm font-medium ${tone.text}`}>
              {applicable === 0 ? "Nothing to prepare yet" : `${done} of ${applicable} ready`}
            </span>
          </div>
        </div>
        <p className="ml-auto max-w-xs text-pretty text-xs text-faint">
          Pre-departure readiness across the ISO 31030 travel lifecycle. Only items that apply to this trip are
          counted; nothing is marked done unless your data says so.
        </p>
      </div>

      {score != null && (
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${score}%` }} />
        </div>
      )}

      {/* Lifecycle lanes */}
      <div className="space-y-4">
        {PHASES.map((phase) => {
          const items = readiness.checks.filter((c) => c.phase === phase);
          if (items.length === 0) return null;
          const isCurrent = phase === currentPhase;
          return (
            <section key={phase}>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
                {PHASE_LABEL[phase]}
                {isCurrent && (
                  <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-text">
                    you are here
                  </span>
                )}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {items.map((c) => (
                  <CheckRow key={c.key} check={c} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
