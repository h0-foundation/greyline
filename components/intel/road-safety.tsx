import { Car, ShieldCheck, TriangleAlert, OctagonAlert, Minus } from "lucide-react";
import {
  getRoadSafety,
  roadBand,
  WHO_GLOBAL_AVG,
  ROAD_SAFETY_SOURCE,
  ROAD_SAFETY_FACTS,
  type RoadBand,
} from "@/lib/road-safety";

/* Road-safety reframe. Server component, display-only. Severity is carried by
 * an icon + a text label + the numeric rate (colour-blind-safe — never colour
 * alone), per research/UX_INTELLIGENCE_DASHBOARDS.md. */

const BAND_ICON: Record<RoadBand, typeof Car> = {
  low: ShieldCheck,
  below: ShieldCheck,
  average: Minus,
  high: TriangleAlert,
  "very-high": OctagonAlert,
};

export function RoadSafetyCard({ code, drivingSide }: { code: string; drivingSide?: string | null }) {
  const data = getRoadSafety(code);
  const band = data ? roadBand(data.ratePer100k) : null;
  const Icon = band ? BAND_ICON[band.band] : Car;
  const pct = data ? Math.min(100, (data.ratePer100k / 35) * 100) : 0;

  return (
    <div className="space-y-4">
      {data && band && (
        <div className="rounded-lg border border-border bg-accent-subtle/30 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl tabular-nums text-foreground">{data.ratePer100k.toFixed(1)}</span>
              <span className="text-xs text-faint">road deaths / 100k / yr · {data.year}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Icon className="size-4" aria-hidden /> {band.label}
            </span>
          </div>
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border"
            role="img"
            aria-label={`${data.ratePer100k} road deaths per 100,000 per year — ${band.label}, ${band.vsGlobal}`}
          >
            <div className="h-full rounded-full bg-foreground/60" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-faint">{band.vsGlobal} (≈{WHO_GLOBAL_AVG} global)</p>
        </div>
      )}

      <ul className="space-y-1.5 text-sm text-foreground">
        {ROAD_SAFETY_FACTS.map((f, i) => (
          <li key={i} className="flex gap-2">
            <Car className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {drivingSide && (
        <p className="text-sm text-faint">
          Traffic drives on the <strong className="text-foreground">{drivingSide}</strong>
          {drivingSide === "left" ? " — look right first when crossing." : drivingSide === "right" ? " — look left first when crossing." : "."}
        </p>
      )}

      <p className="text-[11px] text-faint">
        {data ? `Source: ${ROAD_SAFETY_SOURCE}.` : `No bundled per-country rate for this destination — the guidance above still applies. Source: ${ROAD_SAFETY_SOURCE}.`}
      </p>
    </div>
  );
}
