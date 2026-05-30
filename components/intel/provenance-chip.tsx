import { ShieldCheck, ShieldQuestion, ShieldAlert, Clock } from "lucide-react";

/* Confidence + provenance chips — the trust vocabulary from ODNI ICD-203.
 *
 * Two axes that must NEVER be conflated:
 *   • CONFIDENCE — how much we trust the assessment given the evidence (here:
 *     how complete the inputs are). ICD-203 §confidence.
 *   • LIKELIHOOD — the estimative probability of an outcome. ICD-203 maps these
 *     to fixed words (below) so a number is never dressed up as certainty.
 * Freshness/provenance is shown separately, and when it's stale or unknown it is
 * paired with a concrete next action (C2PA provenance UX: design the missing
 * state deliberately). Cues are icon + word, never colour alone (CVD-safe). */

export type Confidence = "high" | "moderate" | "low";

/** ODNI ICD-203 estimative-likelihood bands. Kept distinct from confidence. */
export const ICD203_LIKELIHOOD = [
  "almost no chance",
  "very unlikely",
  "unlikely",
  "roughly even chance",
  "likely",
  "very likely",
  "almost certain",
] as const;

/** Map an input-coverage fraction (0–1) to a confidence band. */
export function coverageToConfidence(coverage: number): Confidence {
  if (coverage >= 0.8) return "high";
  if (coverage >= 0.5) return "moderate";
  return "low";
}

const TONE: Record<Confidence, { icon: typeof ShieldCheck; text: string; label: string }> = {
  high: { icon: ShieldCheck, text: "text-success", label: "High confidence" },
  moderate: { icon: ShieldQuestion, text: "text-warning", label: "Moderate confidence" },
  low: { icon: ShieldAlert, text: "text-destructive", label: "Low confidence" },
};

const chipClass =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-2 py-0.5 text-[11px] font-medium";

export function ConfidenceChip({ confidence, detail }: { confidence: Confidence; detail?: string }) {
  const t = TONE[confidence];
  const Icon = t.icon;
  return (
    <span className={chipClass} title="Confidence reflects how complete the evidence is — not the level of risk.">
      <Icon className={`size-3 ${t.text}`} />
      <span className={t.text}>{t.label}</span>
      {detail && <span className="text-faint">· {detail}</span>}
    </span>
  );
}

export function ProvenanceChip({
  sources,
  asOf,
  nextAction,
}: {
  sources?: string;
  asOf?: string | null;
  nextAction?: string;
}) {
  const stale = !asOf;
  return (
    <span className={`${chipClass} text-faint`}>
      <Clock className="size-3" />
      <span>
        {sources ? `${sources} · ` : ""}
        {asOf ? `as of ${asOf}` : "freshness unknown"}
        {stale && nextAction ? ` — ${nextAction}` : ""}
      </span>
    </span>
  );
}
