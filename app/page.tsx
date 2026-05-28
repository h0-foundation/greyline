import Link from "next/link";
import {
  ShieldCheck, Compass, Globe, Lock, ArrowRight, Plug, WifiOff,
  Plane, BookOpenText, Eye, ImageOff, ListChecks, FileBadge, MapPin,
  Sparkles, AlertTriangle, Stamp, Banknote, CloudSun,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CountUp } from "@/components/count-up";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import { getAllTrips, getDestinationsByTrip } from "$server/db/repositories/trip";
import { getChecklistsByTrip } from "$server/db/repositories/checklist";
import { getFlightsByTrip } from "$server/db/repositories/flight";
import { getAllVaultDocs } from "$server/db/repositories/vault";
import { getAllSettings, getApiToggles } from "$server/db/repositories/settings";
import { getTravelStats, getVisitedCountries } from "$server/db/repositories/travel";
import {
  getPeakAdvisories,
  getCountryIndices,
} from "$server/db/repositories/dossier";
import {
  getAirlineRules,
  getDocTemplates,
  getPackingTemplates,
} from "$server/db/repositories/templates";
import { WorldMap } from "@/components/travel/world-map";
import { formatTripDate, type DatePrecision } from "@/lib/trip-format";
import { computeOnThisDay, yearsAgo } from "@/lib/on-this-day";
import {
  aggregateAirlineRules,
  buildDocChecklist,
  buildPackingList,
  inferClimateTags,
} from "@/lib/trip-kit";

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

type Destination = {
  id: string; country_code: string | null; city: string | null;
  arrival_date: string | null; departure_date: string | null;
  sort_order: number; notes: string | null; lat: number | null; lng: number | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  planning: "secondary",
  active: "default",
  wrapped: "outline",
};

function readinessFor(tripId: string): { packing: number | null; docs: number | null } {
  const lists = getChecklistsByTrip(tripId);
  function pct(items: string): number {
    try {
      const arr = JSON.parse(items) as Array<{ checked: boolean }>;
      if (arr.length === 0) return 0;
      return Math.round((arr.filter((i) => i.checked).length / arr.length) * 100);
    } catch { return 0; }
  }
  const pack = lists.find((l) => l.type === "packing");
  const docs = lists.find((l) => l.type === "documents");
  return {
    packing: pack ? pct(pack.items) : null,
    docs: docs ? pct(docs.items) : null,
  };
}

export default function Home() {
  // ── Foundations ─────────────────────────────────────────────────────────
  const countryRows = getCountryListRows();
  const knownCodes = countryRows.map((r) => r.country_code);
  const settings = getAllSettings();
  const fullyOffline = settings.master_offline === "true";
  const toggles = getApiToggles();
  const enabledConnections = toggles.filter((t) => t.enabled).length;
  const home_iso2 = (settings.home_country ?? "").replace(/"/g, "") || null;
  const homeIndices = home_iso2 ? getCountryIndices(home_iso2) : undefined;

  // ── Trips ───────────────────────────────────────────────────────────────
  const trips = getAllTrips() as Trip[];
  const upcoming =
    trips.find((t) => t.status === "active") ??
    trips.find((t) => t.status === "planning") ??
    null;
  const recent = [...trips]
    .filter((t) => t.end_date)
    .sort((a, b) => (b.end_date ?? "").localeCompare(a.end_date ?? ""))[0] ?? null;
  const headline = upcoming ?? recent;
  const headlineLabel = upcoming
    ? upcoming.status === "active" ? "Active trip" : "Upcoming trip"
    : "Most recent trip";

  // ── Travel atlas ────────────────────────────────────────────────────────
  const travel = getTravelStats();
  const visited = getVisitedCountries();
  const vaultCount = getAllVaultDocs().length;

  // ── Per-trip enrichment for the headline ────────────────────────────────
  const headlineDestinations: Destination[] = headline ? getDestinationsByTrip(headline.id) as Destination[] : [];
  const headlineFlights = headline ? getFlightsByTrip(headline.id) : [];
  const headlineCarriers = Array.from(new Set(headlineFlights.map((f) => (f.carrier_iata ?? "").toUpperCase()).filter(Boolean)));
  const headlineRules = headlineCarriers.length ? getAirlineRules(headlineCarriers) : [];
  const headlineLimits = headlineCarriers.length ? aggregateAirlineRules(headlineRules) : null;
  const headlineReadiness = headline ? readinessFor(headline.id) : { packing: null, docs: null };

  // Auto-template counts (to show "potential items" in readiness state).
  let docsPlanned = 0, packingPlanned = 0;
  if (headline && headlineDestinations.length) {
    const isos = [...new Set(headlineDestinations.map((d) => d.country_code).filter(Boolean) as string[])];
    docsPlanned = buildDocChecklist(getDocTemplates({ iso2s: isos })).reduce((n, g) => n + g.items.length, 0);
    packingPlanned = buildPackingList({
      templates: getPackingTemplates(),
      threat_tier: 3,
      destinations: headlineDestinations.map((d) => ({
        country_code: d.country_code,
        climate_tags: inferClimateTags(d.lat),
      })),
    }).reduce((n, g) => n + g.items.length, 0);
  }

  // ── Hotspot advisories — countries on planning/active trips at L3+ ──────
  const peaks = getPeakAdvisories();
  const futureIsos = new Set<string>();
  for (const t of trips) {
    if (t.status === "wrapped") continue;
    for (const d of getDestinationsByTrip(t.id) as Destination[]) {
      if (d.country_code) futureIsos.add(d.country_code.toUpperCase());
    }
  }
  const hotspots = [...futureIsos]
    .map((iso) => peaks.get(iso))
    .filter((p): p is NonNullable<typeof p> => !!p && p.level >= 3)
    .sort((a, b) => b.level - a.level);

  // On This Day across all trips.
  const otd = computeOnThisDay(trips);

  return (
    <div className="space-y-10">
      {/* ── EDITORIAL HEADER ────────────────────────────────────────────── */}
      <header className="relative space-y-4 pb-2">
        <p className="label-caps text-faint">
          Greyline · private travel intelligence
        </p>
        <h1 className="font-display text-balance text-4xl font-semibold leading-[1.05] text-foreground sm:text-6xl">
          Every country you&apos;ve been.
          <span className="block text-muted-foreground">Everywhere you&apos;re going.</span>
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <p className="max-w-prose text-pretty text-sm text-muted-foreground">
            A lifetime logbook + per-trip briefing — mapped, threat-aware, and stored only on this machine.
          </p>
          <Badge
            variant={fullyOffline ? "secondary" : "outline"}
            className="gap-1.5 px-2.5 py-1 text-xs"
          >
            {fullyOffline ? <WifiOff className="size-3.5" /> : <Plug className="size-3.5" />}
            {fullyOffline
              ? "Fully offline — no connections"
              : `${enabledConnections} optional connection${enabledConnections === 1 ? "" : "s"} on`}
          </Badge>
        </div>
      </header>

      {/* ── KPI STRIP ───────────────────────────────────────────────────── */}
      <section
        aria-label="Travel at a glance"
        className="grid grid-cols-2 gap-6 border-b border-border pb-6 sm:grid-cols-3 lg:grid-cols-6"
      >
        <Kpi label="Trips" value={trips.length} href="/trips" />
        <Kpi label="Countries" value={travel.countries} href="/countries" />
        <Kpi label="Days abroad" value={travel.totalDays} href="/trips" />
        <Kpi label="Continents" value={travel.continents} href="/countries" />
        <Kpi
          label="Visa-free reach"
          value={homeIndices?.visa_free_count ?? 0}
          suffix={homeIndices?.visa_free_count ? " / 199" : ""}
          href="/tools/visa"
        />
        <Kpi label="Vault docs" value={vaultCount} href="/vault" />
      </section>

      {/* ── ON THIS DAY hairline ────────────────────────────────────────── */}
      {otd.length > 0 && (
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 -mt-4 text-sm">
          <span className="label-caps shrink-0">On this day</span>
          {otd.slice(0, 3).map((e, i) => {
            const n = yearsAgo(e);
            return (
              <span key={e.tripId} className="text-muted-foreground">
                {i > 0 && <span className="mx-2 text-faint">·</span>}
                <Link
                  href={`/trips/${e.tripId}`}
                  className="text-foreground transition-colors hover:text-accent-text"
                >
                  {n === 0 ? "today" : `${n} year${n === 1 ? "" : "s"} ago`}
                </Link>
                <span className="text-faint"> — </span>
                {e.name}
              </span>
            );
          })}
        </p>
      )}

      {/* ── HOTSPOT ADVISORIES — countries on upcoming trips at L3+ ─────── */}
      {hotspots.length > 0 && (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 surface-raised">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-destructive/20 pb-2">
            <h2 className="font-display text-sm font-semibold text-destructive inline-flex items-center gap-2">
              <AlertTriangle className="size-4" />
              Hotspot advisories on upcoming trips
            </h2>
            <p className="font-mono text-[11px] text-faint">multi-source · highest level shown</p>
          </div>
          <ul className="mt-3 space-y-1.5">
            {hotspots.slice(0, 5).map((h) => (
              <li key={h.iso2} className="flex items-baseline gap-3 text-sm">
                <Link
                  href={`/countries/${h.iso2}`}
                  className="font-mono text-xs text-destructive hover:underline"
                >
                  {h.iso2}
                </Link>
                <span className="text-foreground">{h.level_label}</span>
                <span className="text-muted-foreground line-clamp-1 text-pretty flex-1">{h.summary}</span>
                <span className="shrink-0 font-mono text-[10px] text-faint">
                  L{h.level} · {h.sources_count}src
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── MAP + UPCOMING TRIP RAIL ────────────────────────────────────── */}
      {travel.totalTrips > 0 ? (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <WorldMap
              home={home_iso2 ?? ""}
              knownCodes={knownCodes}
              visited={visited.map((v) => ({ code: v.country_code, name: v.name, days: v.days, trips: v.trips, flag: v.flag, first: v.first, last: v.last }))}
            />
          </div>

          {/* Upcoming-trip rail */}
          <aside className="space-y-5">
            {headline ? (
              <Link
                href={`/trips/${headline.id}`}
                className="surface-interactive group block rounded-xl border border-border bg-card p-5 hover:border-primary/30"
              >
                <div className="flex items-baseline justify-between gap-2 border-b border-border pb-2">
                  <span className="label-caps inline-flex items-center gap-1.5 text-faint">
                    <Compass className="size-3" /> {headlineLabel}
                  </span>
                  <Badge variant={STATUS_VARIANT[headline.status] ?? "secondary"} className="capitalize">
                    {headline.status}
                  </Badge>
                </div>
                <h2 className="mt-3 font-display text-2xl font-semibold leading-tight text-foreground group-hover:text-accent-text">
                  {headline.name}
                </h2>
                <p className="font-mono text-xs tabular-nums text-faint">
                  {formatTripDate(headline.start_date, headline.end_date, headline.date_precision as DatePrecision) || "—"}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <Stat
                    label="Destinations"
                    value={String(headlineDestinations.length)}
                    icon={MapPin}
                  />
                  <Stat
                    label="Flights"
                    value={String(headlineFlights.length)}
                    icon={Plane}
                  />
                  <Stat
                    label="Carriers"
                    value={String(headlineCarriers.length || "—")}
                    icon={Plane}
                  />
                </div>

                {headlineLimits && (
                  <div className="mt-3 rounded-md border border-border bg-background/40 p-3 text-xs">
                    <p className="label-caps text-faint">Tightest cabin limit</p>
                    <p className="mt-1 font-mono tabular-nums text-foreground">
                      {headlineLimits.cabin_l_cm ?? "—"}×{headlineLimits.cabin_w_cm ?? "—"}×{headlineLimits.cabin_h_cm ?? "—"} cm
                      {headlineLimits.cabin_weight_kg != null && (
                        <span className="text-faint"> · {headlineLimits.cabin_weight_kg}kg</span>
                      )}
                    </p>
                    {headlineLimits.source_carrier && (
                      <p className="text-[10px] text-faint">{headlineLimits.source_carrier}</p>
                    )}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <ReadinessTile
                    label="Packing"
                    pct={headlineReadiness.packing}
                    planned={packingPlanned}
                    icon={ListChecks}
                  />
                  <ReadinessTile
                    label="Documents"
                    pct={headlineReadiness.docs}
                    planned={docsPlanned}
                    icon={FileBadge}
                  />
                </div>

                <p className="mt-4 inline-flex items-center gap-1 text-sm text-accent-text">
                  Open trip <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </p>
              </Link>
            ) : (
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="label-caps text-faint">No active trip</p>
                <h2 className="mt-2 font-display text-lg font-semibold text-foreground">Plan your first trip</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The briefing, packing list, and document checklist auto-fill the moment you add destinations.
                </p>
                <Link
                  href="/trips"
                  className="mt-3 inline-flex items-center gap-1 text-sm text-accent-text hover:underline"
                >
                  Open trips <ArrowRight className="size-4" />
                </Link>
              </div>
            )}

            {/* Atlas roll-up tile */}
            <Link
              href="/trips"
              className="surface-interactive group block rounded-xl border border-border bg-card p-5 hover:border-primary/30"
            >
              <span className="label-caps text-faint inline-flex items-center gap-1.5">
                <Sparkles className="size-3" /> Atlas
              </span>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <SmallStat value={travel.countries} label="countries" />
                <SmallStat value={`${travel.pctOfWorld}%`} label="of the world" />
                <SmallStat value={travel.totalDays} label="days" />
                <SmallStat value={travel.continents} label="continents" />
              </div>
              <p className="mt-4 inline-flex items-center gap-1 text-sm text-accent-text">
                Open atlas <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          </aside>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card p-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground">No trips yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first trip and Greyline builds the briefing, packing, and document checklist around it.
          </p>
          <Link
            href="/trips"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Start a trip <ArrowRight className="size-4" />
          </Link>
        </section>
      )}

      {/* ── WORKFLOW — every tool routed by lifecycle phase ─────────────── */}
      <section className="space-y-5">
        <h2 className="font-display text-lg font-semibold text-foreground">Workflow</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <WorkflowCard
            phase="Plan"
            tools={[
              { href: "/tools/visa", icon: Stamp, label: "Visa matrix" },
              { href: "/countries?advisory=2", icon: AlertTriangle, label: "Advisories" },
              { href: "/tools/airports", icon: Plane, label: "Airports" },
              { href: "/tools/currency", icon: Banknote, label: "Currency" },
              { href: "/tools/weather", icon: CloudSun, label: "Weather" },
            ]}
          />
          <WorkflowCard
            phase="Pack"
            tools={[
              { href: "/tools/packing", icon: ListChecks, label: "Packing library" },
              { href: "/tools/border", icon: ShieldCheck, label: "Border kit" },
              { href: "/tools/hotel", icon: Lock, label: "Hotel security" },
              { href: "/tools/exif", icon: ImageOff, label: "EXIF strip" },
              { href: "/tools/self-doxxing", icon: Eye, label: "Self-doxxing" },
            ]}
          />
          <WorkflowCard
            phase="Go"
            tools={[
              { href: "/map", icon: MapPin, label: "OSINT map" },
              { href: "/surveillance", icon: Eye, label: "Surveillance log" },
              { href: "/vault", icon: Lock, label: "Vault" },
              { href: "/disclosure", icon: BookOpenText, label: "Disclosure export" },
              { href: "/settings", icon: Plug, label: "Connections" },
            ]}
          />
        </div>
      </section>
    </div>
  );
}

// ── Primitives ──────────────────────────────────────────────────────────────

function Kpi({
  label, value, suffix, href,
}: {
  label: string; value: number; suffix?: string; href: string;
}) {
  return (
    <Link
      href={href}
      className="group block space-y-1 transition-colors duration-[var(--duration-snap)]"
    >
      <p className="label-caps text-faint">{label}</p>
      <p className="font-mono text-3xl font-semibold tabular-nums text-foreground group-hover:text-accent-text">
        <CountUp to={value} />{suffix ?? ""}
      </p>
    </Link>
  );
}

function Stat({
  label, value, icon: Icon,
}: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-0.5">
      <p className="label-caps text-faint inline-flex items-center gap-1">
        <Icon className="size-3" /> {label}
      </p>
      <p className="font-mono text-sm font-medium tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function SmallStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="font-mono text-xl font-semibold tabular-nums text-foreground"><CountUp to={typeof value === "number" ? value : 0} />{typeof value === "string" ? value : ""}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ReadinessTile({
  label, pct, planned, icon: Icon,
}: {
  label: string; pct: number | null; planned: number; icon: React.ComponentType<{ className?: string }>;
}) {
  const has = pct != null;
  return (
    <div className="rounded-md border border-border bg-background/40 p-2.5">
      <p className="label-caps text-faint inline-flex items-center gap-1">
        <Icon className="size-3" /> {label}
      </p>
      <p className="mt-1 font-mono text-sm font-medium tabular-nums">
        {has ? (
          <>
            <span className="text-foreground">{pct}%</span>
          </>
        ) : (
          <span className="text-faint">untouched</span>
        )}
      </p>
      <p className="text-[10px] text-faint">
        {has ? "ready" : `${planned} items waiting`}
      </p>
    </div>
  );
}

function WorkflowCard({
  phase,
  tools,
}: {
  phase: string;
  tools: Array<{ href: string; icon: React.ComponentType<{ className?: string }>; label: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 surface-raised">
      <p className="label-caps text-faint">{phase}</p>
      <ul className="mt-3 space-y-1">
        {tools.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="-mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors duration-[var(--duration-snap)] hover:bg-accent hover:text-foreground"
            >
              <t.icon className="size-3.5 text-faint" />
              <span>{t.label}</span>
              <ArrowRight className="ml-auto size-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// suppress unused-import lint while keeping the icons exported for future moves
void Globe;
