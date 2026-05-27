import Link from "next/link";
import { Globe2, CalendarClock, Plane, MapPinned, Sparkles } from "lucide-react";
import { CountUp } from "@/components/count-up";
import { WorldMap } from "@/components/travel/world-map";
import type { TravelStats, VisitedCountry } from "$server/db/repositories/travel";

function Stat({
  value, label, suffix = "", icon: Icon,
}: {
  value: number; label: string; suffix?: string; icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <Icon className="size-4 text-faint" />
      <div className="mt-3 font-mono text-2xl font-semibold tabular-nums text-foreground">
        <CountUp to={value} />{suffix}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function TravelAtlas({
  stats, visited, onThisDay,
}: {
  stats: TravelStats;
  visited: VisitedCountry[];
  onThisDay: { name: string; flag: string; year: number; tripId: string }[];
}) {
  if (stats.totalTrips === 0) return null;
  const maxYear = Math.max(1, ...stats.byYear.map((y) => y.days));

  return (
    <section className="space-y-5">
      {/* The trust anchor — your record, yours alone */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-accent-text" />
        <span>Your life&apos;s travels — <span className="text-foreground">yours alone, on this machine</span>.</span>
      </div>

      {/* Hero scratch-map — your visited world, fully offline */}
      <WorldMap visited={visited.map((v) => ({ code: v.country_code, name: v.name, days: v.days, trips: v.trips }))} />

      {/* Delight stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat value={stats.countries} label="Countries" icon={Globe2} />
        <Stat value={stats.continents} label="Continents" icon={MapPinned} />
        <Stat value={stats.totalDays} label="Days abroad" icon={CalendarClock} />
        <Stat value={stats.pctOfWorld} suffix="%" label="of the world" icon={Globe2} />
        <Stat value={stats.totalTrips} label="Trips logged" icon={Plane} />
      </div>

      {/* On this day — Day One's #1 retention hook */}
      {onThisDay.length > 0 && (
        <div className="rounded-xl border border-accent-subtle bg-accent-subtle/40 p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent-subtle-foreground">
            <CalendarClock className="size-3.5" /> On this day
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {onThisDay.map((t) => (
              <li key={t.tripId}>
                <Link href={`/trips/${t.tripId}`} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-sm hover:border-primary/30">
                  <span aria-hidden>{t.flag}</span> {t.name} <span className="font-mono text-xs text-faint">{t.year}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Year-by-year — the lifetime record made narrative */}
      {stats.byYear.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">Days abroad by year</h3>
          <div className="flex items-end gap-1.5" style={{ height: 80 }}>
            {stats.byYear.map((y) => (
              <div key={y.year} className="group flex flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                  style={{ height: `${Math.max(4, (y.days / maxYear) * 64)}px` }}
                  title={`${y.year}: ${y.days} days, ${y.countries} countries, ${y.trips} trips`}
                />
                <span className="text-[10px] tabular-nums text-faint">{`'${String(y.year).slice(2)}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Countries visited — a wall of passport stamps (the collectible peak) */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">
          Passport stamps <span className="text-muted-foreground">· {visited.length} countries</span>
        </h3>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visited.map((c, i) => {
            const tilt = [-2, 1.5, -1, 2, -1.5, 1][i % 6]; // hand-stamped jitter
            return (
              <li key={c.country_code}>
                <Link
                  href={`/countries/${c.country_code}`}
                  style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}
                  className="group flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-primary/35 bg-primary/[0.04] p-2 text-center [transform:rotate(var(--tilt))] transition-transform duration-200 ease-out hover:[transform:rotate(0deg)_scale(1.04)] hover:border-primary/60"
                >
                  <span className="text-2xl leading-none grayscale-[0.15] group-hover:grayscale-0" aria-hidden>{c.flag || "🏳️"}</span>
                  <span className="block w-full truncate text-[11px] font-semibold uppercase tracking-wide text-accent-text">{c.name}</span>
                  <span className="font-mono text-[10px] tabular-nums text-faint">
                    {c.first ? c.first.slice(0, 4) : "—"} · {c.trips}×
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
