import { Swords } from "lucide-react";

type Year = { year: number; deaths: number; events: number };

/** UCDP armed-conflict fatality trend for a country's dossier. CVD-safe: each
 *  year shows a bar plus its number; severity is conveyed by height + label,
 *  never colour alone. Presentational — data comes from getConflictTrend. */
export function ConflictTrend({ recent, total }: { recent: Year[]; total: number }) {
  const max = Math.max(1, ...recent.map((r) => r.deaths));
  const latest = recent[recent.length - 1];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label={`Fatalities, ${latest.year}`} value={latest.deaths} />
        <Stat label={`Events, ${latest.year}`} value={latest.events} />
        <Stat label="Total on record" value={total} />
      </div>

      <div>
        <div className="flex h-24 items-end gap-1" role="img" aria-label={`Conflict fatalities by year, ${recent[0].year} to ${latest.year}`}>
          {recent.map((r) => (
            <div key={r.year} className="flex min-w-0 flex-1 flex-col items-center justify-end" title={`${r.year}: ${r.deaths.toLocaleString()} deaths across ${r.events} events`}>
              <span className="mb-1 text-[10px] tabular-nums text-faint">{r.deaths > 0 ? compact(r.deaths) : ""}</span>
              <div
                className="w-full rounded-t-sm bg-destructive/70"
                style={{ height: `${Math.max(2, Math.round((r.deaths / max) * 100))}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1">
          {recent.map((r) => (
            <span key={r.year} className="min-w-0 flex-1 text-center text-[10px] tabular-nums text-faint">
              {`'${String(r.year).slice(2)}`}
            </span>
          ))}
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Swords className="mt-0.5 size-3.5 shrink-0 text-faint" />
        UCDP best-estimate fatalities from organised violence (state-based, non-state, and one-sided). Source: Uppsala Conflict Data Program, Georeferenced Event Dataset (CC&nbsp;BY).
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="label-caps text-faint">{label}</p>
      <p className="font-display text-2xl font-semibold tabular-nums text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
