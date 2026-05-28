import Link from "next/link";
import {
  ShieldCheck,
  Compass,
  Globe,
  Lock,
  ListChecks,
  ArrowRight,
  MapPin,
  Plug,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CountUp } from "@/components/count-up";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import { getAllTrips, getDestinationsByTrip } from "$server/db/repositories/trip";
import { getChecklistsByTrip } from "$server/db/repositories/checklist";
import { getAllVaultDocs } from "$server/db/repositories/vault";
import { getAllSettings, getApiToggles } from "$server/db/repositories/settings";
import { getTravelStats, getVisitedCountries } from "$server/db/repositories/travel";
import { WorldMap } from "@/components/travel/world-map";
import { formatTripDate, type DatePrecision } from "@/lib/trip-format";

// Reads local SQLite at request time.
export const dynamic = "force-dynamic";

type Trip = {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  date_precision: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  planning: "secondary",
  active: "default",
  wrapped: "outline",
};


export default function Home() {
  const countryRows = getCountryListRows();
  const countriesCount = countryRows.length;
  const knownCodes = countryRows.map((r) => r.country_code);
  const trips = getAllTrips() as Trip[];
  // Headline = an upcoming/active trip if there is one, else your most recent trip.
  const upcoming =
    trips.find((t) => t.status === "active") ?? trips.find((t) => t.status === "planning") ?? null;
  const recent = [...trips]
    .filter((t) => t.end_date)
    .sort((a, b) => (b.end_date ?? "").localeCompare(a.end_date ?? ""))[0] ?? null;
  const headline = upcoming ?? recent;
  const headlineLabel = upcoming
    ? upcoming.status === "active" ? "Active trip" : "Upcoming trip"
    : "Most recent trip";

  const destinations = headline ? getDestinationsByTrip(headline.id) : [];
  const checklists = headline ? getChecklistsByTrip(headline.id) : [];
  let totalItems = 0;
  let checkedItems = 0;
  for (const cl of checklists) {
    try {
      const items = JSON.parse(cl.items) as Array<{ checked: boolean }>;
      totalItems += items.length;
      checkedItems += items.filter((i) => i.checked).length;
    } catch {
      /* skip malformed */
    }
  }
  const readiness = totalItems ? Math.round((checkedItems / totalItems) * 100) : 0;

  const vaultCount = getAllVaultDocs().length;
  const travel = getTravelStats();
  const visited = getVisitedCountries();

  const settings = getAllSettings();
  const fullyOffline = settings.master_offline === "true";
  const toggles = getApiToggles();
  const enabledConnections = toggles.filter((t) => t.enabled).length;

  return (
    <div className="space-y-6">
      {/* Reassurance — the privacy through-line, always visible */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-accent-subtle/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Every country you&apos;ve been. Everywhere you&apos;re going.
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Your private lifetime travel log — mapped and yours alone — plus a briefing on what each
            border knows about you. No account, no cloud, nothing leaves this machine.
          </p>
        </div>
        <Badge
          variant={fullyOffline ? "secondary" : "outline"}
          className="self-start gap-1.5 px-2.5 py-1 text-xs sm:self-center"
        >
          {fullyOffline ? <WifiOff className="size-3.5" /> : <Plug className="size-3.5" />}
          {fullyOffline
            ? "Fully offline — no connections"
            : `${enabledConnections} optional connection${enabledConnections === 1 ? "" : "s"} on`}
        </Badge>
      </div>

      {/* Travel hero — your visited world, the emotional anchor */}
      {travel.totalTrips > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <WorldMap
              home={(settings.home_country ?? "").replace(/"/g, "")}
              knownCodes={knownCodes}
              visited={visited.map((v) => ({ code: v.country_code, name: v.name, days: v.days, trips: v.trips, flag: v.flag, first: v.first, last: v.last }))}
            />
          </div>
          <Link
            href="/trips"
            className="surface-interactive group flex flex-col justify-center gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/30"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-mono text-3xl font-semibold tabular-nums text-foreground"><CountUp to={travel.countries} /></div>
                <div className="text-xs text-muted-foreground">countries</div>
              </div>
              <div>
                <div className="font-mono text-3xl font-semibold tabular-nums text-foreground"><CountUp to={travel.pctOfWorld} />%</div>
                <div className="text-xs text-muted-foreground">of the world</div>
              </div>
              <div>
                <div className="font-mono text-3xl font-semibold tabular-nums text-foreground"><CountUp to={travel.totalDays} /></div>
                <div className="text-xs text-muted-foreground">days abroad</div>
              </div>
              <div>
                <div className="font-mono text-3xl font-semibold tabular-nums text-foreground"><CountUp to={travel.continents} /></div>
                <div className="text-xs text-muted-foreground">continents</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-sm text-accent-text">
              Open your atlas <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      )}

      {/* Bento: active trip + privacy posture */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Link
          href="/trips"
          className="surface-interactive group flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:col-span-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
                <Compass className="size-3.5" />
                {headline ? headlineLabel : "Trips"}
              </span>
              <h2 className="font-display text-xl font-semibold text-foreground group-hover:text-accent-text">
                {headline ? headline.name : "Plan your first trip"}
              </h2>
            </div>
            {headline && (
              <Badge variant={STATUS_VARIANT[headline.status] ?? "secondary"} className="capitalize">
                {headline.status}
              </Badge>
            )}
          </div>

          {headline ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-faint" />
                {destinations.length} destination{destinations.length === 1 ? "" : "s"}
              </span>
              {formatTripDate(headline.start_date, headline.end_date, headline.date_precision as DatePrecision) && (
                <span className="font-mono text-xs tabular-nums">
                  {formatTripDate(headline.start_date, headline.end_date, headline.date_precision as DatePrecision)}
                </span>
              )}
              {totalItems > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks className="size-4 text-faint" />
                  {readiness}% ready
                </span>
              )}
              <span className="ml-auto inline-flex items-center gap-1 text-accent-text">
                Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Plan destinations, track readiness, and operate with destination-aware OPSEC — all
              stored locally.
            </p>
          )}
        </Link>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-xs">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
            <ShieldCheck className="size-3.5" />
            Privacy posture
          </span>
          <p className="text-sm text-muted-foreground text-pretty">
            {fullyOffline
              ? "Master offline switch is on. Greyline makes no network requests — every surface renders from bundled local data."
              : `${enabledConnections} of ${toggles.length} optional data connections are enabled. All can be turned off in Settings; nothing is sent without your action.`}
          </p>
          <Link
            href="/settings"
            className="mt-auto inline-flex items-center gap-1 text-sm text-accent-text hover:underline"
          >
            Manage connections <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile href="/countries" icon={Globe} label="Country profiles" value={countriesCount} />
        <StatTile href="/trips" icon={Compass} label="Trips" value={trips.length} />
        <StatTile href="/vault" icon={Lock} label="Vault documents" value={vaultCount} />
        <StatTile href="/trips" icon={ListChecks} label="OPSEC readiness" value={readiness} suffix="%" />
      </div>
    </div>
  );
}

function StatTile({
  href,
  icon: Icon,
  label,
  value,
  suffix = "",
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <Link
      href={href}
      className="surface-interactive group rounded-xl border border-border bg-card p-4 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Icon className="size-4 text-faint" />
      <div className="mt-3 font-mono text-2xl font-semibold tabular-nums text-foreground">
        <CountUp to={value} />
        {suffix}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </Link>
  );
}
