import { Fingerprint } from "lucide-react";
import type { PatternOfLife } from "@/lib/pattern-of-life";

/* Renders the pattern-of-life self-audit. Server component, display-only.
 * Honest framing: illustrative of how distinctive the user's OWN record is
 * (de Montjoye et al. 2013), computed locally — not a re-id probability. */

export function PatternOfLifeCard({ pol }: { pol: PatternOfLife }) {
  if (pol.totalDestinations === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Log destinations (with dates) and this shows how identifying your movement record is — and how much
        coarsening it would take to blur that.
      </p>
    );
  }

  const { coarsening } = pol;
  const maxBar = Math.max(coarsening.countryMonth, coarsening.countryOnly, coarsening.yearOnly, 1);
  const rows: { label: string; value: number; note: string }[] = [
    { label: "Country + month", value: coarsening.countryMonth, note: "as logged — most identifying" },
    { label: "Country only", value: coarsening.countryOnly, note: "drop the dates" },
    { label: "Year only", value: coarsening.yearOnly, note: "drop the places" },
  ];

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <div className="font-display text-5xl font-semibold leading-none tabular-nums text-accent-text">
            {pol.spatioTemporalPoints}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-faint">
            <Fingerprint className="size-4" /> distinct place-time points
          </div>
        </div>
        <p className="ml-auto max-w-sm text-pretty text-xs text-faint">
          As few as <strong className="text-foreground">4</strong> spatio-temporal points typically single a
          person out of 1.5&nbsp;million (de Montjoye et al., 2013). Your record holds{" "}
          <strong className="text-foreground">{pol.spatioTemporalPoints}</strong> across{" "}
          {pol.distinctCountries} countries and {pol.spanYears}&nbsp;years.
        </p>
      </div>

      {/* Coarsening: how the point set shrinks as you blur granularity. */}
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
            <span className="text-foreground">{r.label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-accent-text/40" style={{ width: `${(r.value / maxBar) * 100}%` }} />
            </div>
            <span className="w-28 text-right font-mono text-xs tabular-nums text-faint">
              {r.value} · {r.note}
            </span>
          </div>
        ))}
      </div>

      {pol.rareCountries.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-faint">
            Visited once — individually your most identifying entries:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pol.rareCountries.slice(0, 12).map((c) => (
              <span
                key={c.code}
                className="rounded-md border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground"
              >
                {c.name}
              </span>
            ))}
            {pol.rareCountries.length > 12 && (
              <span className="px-1 py-0.5 text-xs text-faint">+{pol.rareCountries.length - 12} more</span>
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-faint">
        Computed locally from your own log — it never leaves this machine. This illustrates how distinctive your
        trace is; it is not a re-identification probability for your specific case. Coarsen dates/places before
        sharing any record to reduce it.
      </p>
    </div>
  );
}
