import { ShieldAlert } from "lucide-react";
import type { RiskScore, RiskBand } from "@/lib/risk-score";

/* Renders the open-methodology Greyline Risk Score. Server component, no client
 * JS — the "how it's calculated" breakdown uses a native <details>. Risk is
 * conveyed by NUMBER + BAND WORD + bar position (redundant, non-color-only cues)
 * so it stays legible for colour-vision-deficient users. */

const BAND_TONE: Record<RiskBand, { text: string; bar: string }> = {
  Low: { text: "text-success", bar: "bg-success" },
  Moderate: { text: "text-success", bar: "bg-success" },
  Elevated: { text: "text-warning", bar: "bg-warning" },
  High: { text: "text-destructive", bar: "bg-destructive" },
  Extreme: { text: "text-destructive", bar: "bg-destructive" },
};

export function RiskScoreCard({ score }: { score: RiskScore }) {
  if (score.score == null || score.band == null) {
    return (
      <p className="text-sm text-muted-foreground">
        Risk score unavailable — no comparable indices are bundled for this country yet. Run{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">pnpm build:dossier</code> to compute it
        from the Global Peace Index, Fragile States Index, CPI, RSF, and advisories.
      </p>
    );
  }

  const tone = BAND_TONE[score.band];

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div>
          <div className={`font-display text-5xl font-semibold leading-none tabular-nums ${tone.text}`}>
            {score.score}
            <span className="text-2xl text-faint">/100</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <ShieldAlert className={`size-4 ${tone.text}`} />
            <span className={`text-sm font-medium ${tone.text}`}>{score.band} risk</span>
          </div>
        </div>
        <p className="ml-auto max-w-xs text-pretty text-xs text-faint">
          A transparent composite (higher = riskier). Every input and weight is shown below — open methodology,
          not a black box.
          {score.coverage < 1 && (
            <> {" "}Computed from {Math.round(score.coverage * 100)}% of intended inputs; the rest are unavailable.</>
          )}
        </p>
      </div>

      {/* 0-100 risk scale with the score marked by position (cue #3). */}
      <div className="space-y-1">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${score.score}%` }} />
        </div>
        <div className="flex justify-between font-mono text-[10px] text-faint">
          <span>0 · low</span>
          <span>50</span>
          <span>100 · extreme</span>
        </div>
      </div>

      <details className="group rounded-lg border border-border bg-background/40 p-3">
        <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
          <span className="group-open:hidden">▸ How this score is calculated</span>
          <span className="hidden group-open:inline">▾ How this score is calculated</span>
        </summary>
        <ul className="mt-3 space-y-2">
          {score.subScores.map((s) => (
            <li key={s.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 text-sm">
              <span className="text-foreground">{s.label}</span>
              <span className="text-right font-mono text-xs tabular-nums text-faint">
                {s.source} · weight {Math.round(s.weight * 100)}%
              </span>
              <div className="col-span-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-foreground/30" style={{ width: `${s.risk}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums text-faint">{s.risk}</span>
              </div>
            </li>
          ))}
        </ul>
        {score.missing.length > 0 && (
          <p className="mt-3 text-xs text-faint">
            Not yet available for this country: {score.missing.join(", ")}.
          </p>
        )}
        <p className="mt-3 text-[11px] text-faint">
          Composite = weighted mean of the available sub-scores, each normalized to 0–100 risk. Sources: Global
          Peace Index, Fragile States Index, Transparency International CPI, RSF press-freedom, and peak
          multi-government advisory. See research/TRAVEL_RISK_LANDSCAPE.md.
        </p>
      </details>
    </div>
  );
}
