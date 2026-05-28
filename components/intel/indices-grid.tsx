// Comparable global indices — CPI, RSF, FSI, GPI, visa-free count.
// Each tile shows the metric, the year it was last published, and a normalised
// 0..1 bar (good → bad).
import type { CountryIndices } from "$server/db/repositories/dossier";

type Direction = "higher_better" | "lower_better";

function bar(value: number, max: number, dir: Direction): { pct: number; tone: "success" | "warning" | "destructive" | "muted" } {
  if (!Number.isFinite(value)) return { pct: 0, tone: "muted" };
  const clamped = Math.max(0, Math.min(max, value));
  const norm = clamped / max; // 0..1
  const score = dir === "higher_better" ? norm : 1 - norm;
  return {
    pct: Math.round(score * 100),
    tone: score >= 0.66 ? "success" : score >= 0.4 ? "warning" : "destructive",
  };
}

function Tile({
  label,
  value,
  unit,
  year,
  source,
  width,
  tone,
  caption,
}: {
  label: string;
  value: string;
  unit?: string;
  year: number | null | undefined;
  source: string;
  width: number;
  tone: "success" | "warning" | "destructive" | "muted";
  caption: string;
}) {
  const TONE_BAR: Record<typeof tone, string> = {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    muted: "bg-muted",
  } as const;
  return (
    <div className="space-y-1.5">
      <p className="label-caps text-faint">{label}</p>
      <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
        {value}
        {unit && <span className="ml-0.5 text-sm font-normal text-faint">{unit}</span>}
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
        <div
          className={`h-full rounded-full transition-[width] duration-[var(--duration-default)] ease-[var(--ease-out-quint)] ${TONE_BAR[tone]}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="text-xs text-faint">
        {caption}
        {year ? ` · ${year}` : ""}
        {" · "}
        <span className="text-muted-foreground">{source}</span>
      </p>
    </div>
  );
}

export function IndicesGrid({ indices }: { indices: CountryIndices | undefined }) {
  if (!indices) {
    return (
      <p className="text-sm text-muted-foreground">
        Indices unavailable. Run <span className="font-mono text-xs">pnpm build:dossier</span> to seed.
      </p>
    );
  }
  const cpi = bar(indices.cpi_score ?? NaN, 100, "higher_better");
  const rsf = bar(indices.rsf_score ?? NaN, 100, "higher_better");
  const visaFreePct = bar(indices.visa_free_count ?? NaN, 199, "higher_better");
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <Tile
        label="Corruption Perceptions"
        value={indices.cpi_score != null ? String(indices.cpi_score) : "—"}
        unit="/100"
        year={indices.cpi_year}
        source="Transparency Intl"
        width={cpi.pct}
        tone={cpi.tone}
        caption="higher = cleaner public sector"
      />
      <Tile
        label="Press Freedom"
        value={indices.rsf_score != null ? indices.rsf_score.toFixed(1) : "—"}
        unit={indices.rsf_rank ? `· #${indices.rsf_rank}` : undefined}
        year={indices.rsf_year}
        source="RSF"
        width={rsf.pct}
        tone={rsf.tone}
        caption="higher = freer press"
      />
      <Tile
        label="Visa-free reach"
        value={indices.visa_free_count != null ? String(indices.visa_free_count) : "—"}
        unit="/199"
        year={indices.visa_free_year}
        source="Henley methodology"
        width={visaFreePct.pct}
        tone={visaFreePct.tone}
        caption="passport-holders' visa-free destinations"
      />
    </div>
  );
}
