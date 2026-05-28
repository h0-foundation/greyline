/**
 * Home — the cockpit.
 *
 * Designed from research (.research/greyline-home-research-2026-05-27.md, 47 sources):
 *   • Sunsama / Things 3 / Granola — single question answered: "what needs my
 *     attention?" Temporal chunks (Today → Upcoming → Planning → Recent) override
 *     chronological order.
 *   • Tufte data-ink ratio — numbers strip is hairline-separated, no cards, no
 *     shadows. Typography weight does the hierarchy.
 *   • Hick's Law — 3–4 primary actions visible, the rest are progressive
 *     disclosure on `/tools` and `/settings`.
 *   • Linear 2025 refresh — monochrome + one accent; consistency over decoration.
 *   • Polarsteps / Wanderer — map is part of the cockpit, not decoration; it
 *     answers "where am I in the world right now" at a glance.
 *   • Things 3 — "This Today" pattern. Highest-priority *single* item leads.
 */
import Link from "next/link";
import {
  ArrowRight, Plus, Plane, MapPin, ShieldAlert, ListChecks, FileBadge,
  Compass, Lock, Wrench, BookText, AlertTriangle, Eye, WifiOff, Plug, Calendar,
} from "lucide-react";
import { CountUp } from "@/components/count-up";
import { Badge } from "@/components/ui/badge";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import {
  getAllTrips, getDestinationsByTrip,
} from "$server/db/repositories/trip";
import { getChecklistsByTrip } from "$server/db/repositories/checklist";
import { getFlightsByTrip } from "$server/db/repositories/flight";
import { getAllVaultDocs } from "$server/db/repositories/vault";
import { getAllSettings, getApiToggles } from "$server/db/repositories/settings";
import { getTravelStats, getVisitedCountries } from "$server/db/repositories/travel";
import {
  getPeakAdvisories, getCountryIndices,
} from "$server/db/repositories/dossier";
import { getAirlineRules } from "$server/db/repositories/templates";
import { WorldMap } from "@/components/travel/world-map";
import { formatTripDate, type DatePrecision } from "@/lib/trip-format";
import { computeOnThisDay, yearsAgo } from "@/lib/on-this-day";
import { aggregateAirlineRules } from "@/lib/trip-kit";

export const dynamic = "force-dynamic";

// ─ Local types ────────────────────────────────────────────────────────────
type Trip = {
  id: string; name: string; status: string;
  start_date: string | null; end_date: string | null; date_precision: string;
  notes: string | null;
};
type Destination = {
  id: string; country_code: string | null; city: string | null;
  arrival_date: string | null; departure_date: string | null;
  sort_order: number; notes: string | null; lat: number | null; lng: number | null;
};

// ─ Pure helpers ───────────────────────────────────────────────────────────
function daysUntil(start: string | null): number | null {
  if (!start) return null;
  const t = Date.parse(start);
  if (!Number.isFinite(t)) return null;
  return Math.round((t - Date.now()) / 86400000);
}

function pctOf(items: string): number {
  try {
    const arr = JSON.parse(items) as Array<{ checked: boolean }>;
    if (arr.length === 0) return 0;
    return Math.round((arr.filter((i) => i.checked).length / arr.length) * 100);
  } catch { return 0; }
}

const ADV_DOT: Record<number, string> = {
  1: "bg-success",
  2: "bg-warning",
  3: "bg-accent-text",
  4: "bg-destructive",
};
const ADV_TEXT: Record<number, string> = {
  1: "text-success",
  2: "text-warning",
  3: "text-accent-text",
  4: "text-destructive",
};

// ─ Page ───────────────────────────────────────────────────────────────────
export default function Home() {
  // 1. Settings & connections (always-on context).
  const settings = getAllSettings();
  const fullyOffline = settings.master_offline === "true";
  const home_iso2 = (settings.home_country ?? "").replace(/"/g, "") || null;
  const enabledConnections = getApiToggles().filter((t) => t.enabled).length;

  // 2. Trips + temporal partition.
  const trips = getAllTrips() as Trip[];
  const planning = trips.filter((t) => t.status === "planning");
  const active = trips.filter((t) => t.status === "active");
  const wrappedAll = trips.filter((t) => t.status === "wrapped");

  // Enrich planning + active with their cockpit data.
  const peaks = getPeakAdvisories();
  type EnrichedTrip = Trip & {
    daysUntil: number | null;
    destinations: Destination[];
    flagsRow: string;
    flightsCount: number;
    carriersCount: number;
    packingPct: number | null;
    docsPct: number | null;
    peakLevel: number | null;
    tightestCarrier: string | null;
    tightestCabin: { l: number | null; w: number | null; h: number | null; kg: number | null } | null;
  };

  function enrich(t: Trip): EnrichedTrip {
    const destinations = getDestinationsByTrip(t.id) as Destination[];
    const flights = getFlightsByTrip(t.id);
    const carriers = [...new Set(flights.map((f) => (f.carrier_iata ?? "").toUpperCase()).filter(Boolean))];
    const checklists = getChecklistsByTrip(t.id);
    const pack = checklists.find((c) => c.type === "packing");
    const docs = checklists.find((c) => c.type === "documents");
    let peakLevel: number | null = null;
    for (const d of destinations) {
      if (!d.country_code) continue;
      const p = peaks.get(d.country_code.toUpperCase());
      if (p && (peakLevel == null || p.level > peakLevel)) peakLevel = p.level;
    }
    const flagsRow = destinations
      .map((d) => d.country_code ? (countryFlagByIso.get(d.country_code) ?? "") : "")
      .filter(Boolean)
      .slice(0, 6)
      .join(" ");
    let tightestCarrier: string | null = null;
    let tightestCabin: EnrichedTrip["tightestCabin"] = null;
    if (carriers.length) {
      const rules = getAirlineRules(carriers);
      const agg = aggregateAirlineRules(rules);
      tightestCarrier = agg.source_carrier;
      tightestCabin = {
        l: agg.cabin_l_cm, w: agg.cabin_w_cm, h: agg.cabin_h_cm,
        kg: agg.cabin_weight_kg,
      };
    }
    return {
      ...t,
      daysUntil: daysUntil(t.start_date),
      destinations,
      flagsRow,
      flightsCount: flights.length,
      carriersCount: carriers.length,
      packingPct: pack ? pctOf(pack.items) : null,
      docsPct: docs ? pctOf(docs.items) : null,
      peakLevel,
      tightestCarrier,
      tightestCabin,
    };
  }

  // Country flag lookup — load once for the cockpit + map.
  const countryRows = getCountryListRows();
  const countryFlagByIso = new Map<string, string>();
  for (const r of countryRows) {
    try {
      const rc = JSON.parse(r.rest_countries ?? "{}") as { flag?: string };
      if (rc.flag) countryFlagByIso.set(r.country_code, rc.flag);
    } catch { /* skip */ }
  }
  const knownCodes = countryRows.map((r) => r.country_code);

  // Decide "what needs my attention now" — the headline tile.
  // Priority: active trips → planning ≤14d → planning >14d → nothing-in-flight CTA.
  const enrichedActive = active.map(enrich);
  const enrichedPlanning = planning.map(enrich).sort((a, b) => (a.daysUntil ?? 1e9) - (b.daysUntil ?? 1e9));
  const headline: EnrichedTrip | null =
    enrichedActive[0] ?? enrichedPlanning[0] ?? null;

  // Upcoming list = planning trips minus the headline, capped at 3.
  const upcoming = enrichedPlanning
    .filter((t) => t.id !== headline?.id)
    .slice(0, 3);

  // Recent wrapped — for the bottom hairline link.
  const recentWrapped = wrappedAll
    .filter((t) => t.end_date)
    .sort((a, b) => (b.end_date ?? "").localeCompare(a.end_date ?? ""))
    .slice(0, 2);

  // Hotspots — countries on planning/active trips at L3+. Direct-labeled.
  const futureIsos = new Set<string>();
  for (const t of [...enrichedActive, ...enrichedPlanning]) {
    for (const d of t.destinations) if (d.country_code) futureIsos.add(d.country_code.toUpperCase());
  }
  const hotspots = [...futureIsos]
    .map((iso) => peaks.get(iso))
    .filter((p): p is NonNullable<typeof p> => !!p && p.level >= 3)
    .sort((a, b) => b.level - a.level);

  // Travel atlas roll-up.
  const travel = getTravelStats();
  const visited = getVisitedCountries();
  const homeIndices = home_iso2 ? getCountryIndices(home_iso2) : undefined;
  const vaultCount = getAllVaultDocs().length;

  // On-this-day across all trips.
  const otd = computeOnThisDay(trips);

  return (
    <div className="space-y-10">
      {/* ────────────────────────────────────────────────────────────────
          STATUS HAIRLINE — date · privacy posture. Always present.
          Tufte: above the headline because it's context, not content.
        ──────────────────────────────────────────────────────────────── */}
      <div className="-mt-2 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 font-mono text-[11px] uppercase tracking-wide text-faint">
        <span>{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        <span className="inline-flex items-center gap-1.5">
          {fullyOffline ? (
            <><WifiOff className="size-3" /> fully offline</>
          ) : (
            <><Plug className="size-3" /> {enabledConnections} connection{enabledConnections === 1 ? "" : "s"} on</>
          )}
        </span>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          THE COCKPIT TILE
          The one thing that needs attention. Editorial Fraunces lede.
          Per Sunsama: explicit hierarchy — what's most important *now*.
        ──────────────────────────────────────────────────────────────── */}
      {headline ? <CockpitTile trip={headline} /> : <NothingInFlight />}

      {/* ────────────────────────────────────────────────────────────────
          TEMPORAL CHUNKS
          Things 3: today / upcoming / past. We surface Upcoming + Recent.
          (Today is already the cockpit tile.)
        ──────────────────────────────────────────────────────────────── */}
      {(upcoming.length > 0 || recentWrapped.length > 0) && (
        <section className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {upcoming.length > 0 && (
            <UpcomingColumn trips={upcoming} />
          )}
          {recentWrapped.length > 0 && (
            <RecentColumn trips={recentWrapped} totalWrapped={wrappedAll.length} />
          )}
        </section>
      )}

      {/* ────────────────────────────────────────────────────────────────
          NUMBERS — data-ink ratio. Hairline-separated, no cards.
          Mono-tabular, single line of context per metric.
        ──────────────────────────────────────────────────────────────── */}
      <section
        aria-label="At a glance"
        className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-border py-5 sm:grid-cols-3 lg:grid-cols-6"
      >
        <Metric label="Trips" value={trips.length} href="/trips" />
        <Metric label="Countries" value={travel.countries} href="/logbook" />
        <Metric label="Days abroad" value={travel.totalDays} href="/logbook" />
        <Metric label="Continents" value={travel.continents} href="/logbook" />
        <Metric
          label="Visa-free reach"
          value={homeIndices?.visa_free_count ?? 0}
          suffix={homeIndices?.visa_free_count ? " / 199" : ""}
          href={home_iso2 ? `/countries/${home_iso2}` : "/tools/visa"}
        />
        <Metric label="Vault docs" value={vaultCount} href="/vault" />
      </section>

      {/* ────────────────────────────────────────────────────────────────
          MAP + ON-THIS-DAY
          Polarsteps/Wanderer pattern — map is a cockpit instrument, not
          decoration. Paired with the editorial "on this day" hairline.
        ──────────────────────────────────────────────────────────────── */}
      {travel.totalTrips > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-foreground">
              Where you've been
            </h2>
            <Link
              href="/logbook"
              className="font-mono text-xs uppercase tracking-wide text-faint transition-colors hover:text-accent-text"
            >
              Open logbook →
            </Link>
          </div>
          <WorldMap
            home={home_iso2 ?? ""}
            knownCodes={knownCodes}
            visited={visited.map((v) => ({
              code: v.country_code, name: v.name, days: v.days, trips: v.trips,
              flag: v.flag, first: v.first, last: v.last,
            }))}
          />
          {otd.length > 0 && (
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border pt-3 text-sm">
              <span className="label-caps shrink-0">On this day</span>
              {otd.slice(0, 3).map((e, i) => {
                const n = yearsAgo(e);
                return (
                  <span key={e.tripId} className="text-muted-foreground">
                    {i > 0 && <span className="mx-2 text-faint">·</span>}
                    <Link href={`/trips/${e.tripId}`} className="text-foreground transition-colors hover:text-accent-text">
                      {n === 0 ? "today" : `${n} year${n === 1 ? "" : "s"} ago`}
                    </Link>
                    <span className="text-faint"> — </span>
                    {e.name}
                  </span>
                );
              })}
            </p>
          )}
        </section>
      )}

      {/* ────────────────────────────────────────────────────────────────
          HOTSPOTS — conditional. Direct-labeled per Pirolli information scent.
        ──────────────────────────────────────────────────────────────── */}
      {hotspots.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-base font-semibold text-destructive inline-flex items-center gap-2">
              <AlertTriangle className="size-4" /> Hotspots on your route
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-wide text-faint">
              L3 or higher · upcoming trips
            </span>
          </div>
          <ul className="divide-y divide-border rounded-md border border-destructive/30 bg-destructive/5">
            {hotspots.slice(0, 5).map((h) => (
              <li key={h.iso2}>
                <Link
                  href={`/countries/${h.iso2}`}
                  className="group flex items-baseline gap-3 px-3.5 py-2.5 text-sm transition-colors duration-[var(--duration-snap)] hover:bg-destructive/10"
                >
                  <span className={`inline-block size-2 shrink-0 rounded-full ${ADV_DOT[h.level]}`} aria-hidden />
                  <span className="font-mono text-xs text-destructive">{h.iso2}</span>
                  <span className="text-foreground">{h.level_label}</span>
                  <span className="line-clamp-1 flex-1 truncate text-muted-foreground">{h.summary}</span>
                  <span className="shrink-0 font-mono text-[10px] text-faint">L{h.level} · {h.sources_count}src</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ────────────────────────────────────────────────────────────────
          QUICK ACTIONS — Hick's Law: exactly four. Everything else lives
          in /tools or the sidebar.
        ──────────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionTile href="/trips" icon={Compass} label="Trips" />
        <ActionTile href="/countries" icon={MapPin} label="Countries" />
        <ActionTile href="/tools" icon={Wrench} label="Tools" />
        <ActionTile href="/vault" icon={Lock} label="Vault" />
      </section>
    </div>
  );

  // ── Internal compositions (closures over enrich+flag map; keep here so
  //    the cockpit can stay a single-file read.) ────────────────────────

  function CockpitTile({ trip }: { trip: EnrichedTrip }) {
    const status =
      trip.status === "active" ? "On the ground" :
      (trip.daysUntil != null && trip.daysUntil <= 1) ? "Departing today" :
      (trip.daysUntil != null && trip.daysUntil <= 14) ? `Departing in ${trip.daysUntil}d` :
      "Up next";
    const cabin = trip.tightestCabin;
    return (
      <section aria-labelledby="cockpit-headline">
        <p className="label-caps text-faint">{status}</p>
        <h1
          id="cockpit-headline"
          className="mt-2 font-display text-balance text-4xl font-semibold leading-[1.05] text-foreground sm:text-5xl"
        >
          {trip.name}
          {trip.flagsRow && (
            <span aria-hidden className="ml-3 align-middle text-3xl leading-none">
              {trip.flagsRow}
            </span>
          )}
        </h1>
        <p className="mt-2 inline-flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-xs tabular-nums text-faint">
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3" />
            {formatTripDate(trip.start_date, trip.end_date, trip.date_precision as DatePrecision) ?? "no dates"}
          </span>
          {trip.daysUntil != null && (
            <span className={trip.daysUntil <= 1 ? "text-accent-text" : ""}>
              {trip.daysUntil > 0 ? `${trip.daysUntil} day${trip.daysUntil === 1 ? "" : "s"} until departure` :
                trip.daysUntil === 0 ? "today" :
                `started ${-trip.daysUntil} day${-trip.daysUntil === 1 ? "" : "s"} ago`}
            </span>
          )}
        </p>

        {/* Cockpit instruments row — each is one piece of information.
            Each is a deep link (Fitts: target ≥ 44×44).
            Direct labeled per Pirolli; no nested legends. */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Instrument
            href={`/trips/${trip.id}#flights`}
            label="Flights"
            primary={trip.flightsCount > 0 ? String(trip.flightsCount) : "—"}
            sub={trip.carriersCount > 0 ? `${trip.carriersCount} carrier${trip.carriersCount === 1 ? "" : "s"}` : "add a ticket"}
            icon={Plane}
          />
          <Instrument
            href={`/trips/${trip.id}#packing`}
            label="Packing"
            primary={trip.packingPct != null ? `${trip.packingPct}%` : "—"}
            sub={trip.packingPct != null ? "ready" : "not started"}
            icon={ListChecks}
            tone={trip.packingPct == null ? "muted" : trip.packingPct >= 80 ? "success" : trip.packingPct >= 40 ? "warning" : "destructive"}
          />
          <Instrument
            href={`/trips/${trip.id}#documents`}
            label="Documents"
            primary={trip.docsPct != null ? `${trip.docsPct}%` : "—"}
            sub={trip.docsPct != null ? "filed" : "auto-generated"}
            icon={FileBadge}
            tone={trip.docsPct == null ? "muted" : trip.docsPct >= 80 ? "success" : trip.docsPct >= 40 ? "warning" : "destructive"}
          />
          <Instrument
            href={`/trips/${trip.id}`}
            label="Advisory"
            primary={trip.peakLevel != null ? `L${trip.peakLevel}` : "—"}
            sub={trip.peakLevel ? "across all stops" : "no warnings"}
            icon={ShieldAlert}
            dotClass={trip.peakLevel != null ? ADV_DOT[trip.peakLevel] : undefined}
            primaryClass={trip.peakLevel != null ? ADV_TEXT[trip.peakLevel] : undefined}
          />
        </div>

        {/* Tightest carry-on — only when carriers known. Single-purpose row. */}
        {cabin && trip.tightestCarrier && (
          <p className="mt-3 inline-flex items-baseline gap-2 font-mono text-xs text-faint">
            <Plane className="size-3" />
            tightest carry-on
            <span className="text-foreground">
              {cabin.l ?? "—"}×{cabin.w ?? "—"}×{cabin.h ?? "—"} cm
              {cabin.kg != null && ` · ${cabin.kg}kg`}
            </span>
            <span>·</span>
            <span>{trip.tightestCarrier}</span>
          </p>
        )}

        <Link
          href={`/trips/${trip.id}`}
          className="group mt-5 inline-flex items-center gap-1.5 text-sm text-accent-text transition-colors hover:underline"
        >
          Open the trip
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </section>
    );
  }

  function UpcomingColumn({ trips }: { trips: EnrichedTrip[] }) {
    return (
      <div className="space-y-3">
        <h2 className="font-display text-base font-semibold text-foreground inline-flex items-center gap-2">
          Up next
          <span className="font-mono text-xs text-faint">· {trips.length} planning</span>
        </h2>
        <ul className="divide-y divide-border">
          {trips.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trips/${t.id}`}
                className="group flex items-baseline justify-between gap-3 py-3 text-sm transition-colors duration-[var(--duration-snap)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-foreground group-hover:text-accent-text">
                    {t.name} {t.flagsRow && <span aria-hidden className="ml-1 align-baseline">{t.flagsRow}</span>}
                  </span>
                  <span className="font-mono text-[11px] text-faint">
                    {formatTripDate(t.start_date, t.end_date, t.date_precision as DatePrecision) ?? "no dates"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="font-mono text-sm tabular-nums text-foreground">
                    {t.daysUntil != null ? `${t.daysUntil}d` : "—"}
                  </span>
                  <span className="block text-[10px] text-faint">until departure</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function RecentColumn({ trips, totalWrapped }: { trips: Trip[]; totalWrapped: number }) {
    return (
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-foreground inline-flex items-center gap-2">
            <BookText className="size-4 text-faint" /> Recent
            <span className="font-mono text-xs text-faint">· {totalWrapped} wrapped</span>
          </h2>
          <Link href="/logbook" className="font-mono text-[11px] uppercase tracking-wide text-faint transition-colors hover:text-accent-text">
            Logbook →
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {trips.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trips/${t.id}`}
                className="group flex items-baseline justify-between gap-3 py-3 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-muted-foreground group-hover:text-accent-text">
                  {t.name}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-faint tabular-nums">
                  {t.end_date?.slice(0, 7) ?? "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function NothingInFlight() {
    return (
      <section>
        <p className="label-caps text-faint">Nothing in flight</p>
        <h1 className="mt-2 font-display text-balance text-4xl font-semibold leading-[1.05] text-foreground sm:text-5xl">
          Plan the next one.
        </h1>
        <p className="mt-3 max-w-prose text-pretty text-sm text-muted-foreground">
          Add a trip and Greyline auto-generates the briefing, packing list, and document
          checklist around it — pulled from every dossier your local database holds.
        </p>
        <Link
          href="/trips"
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" /> Start a trip
        </Link>
      </section>
    );
  }
}

// ── Reusable primitives ────────────────────────────────────────────────────

function Metric({
  label, value, suffix, href,
}: {
  label: string; value: number; suffix?: string; href: string;
}) {
  return (
    <Link href={href} className="group block space-y-0.5 transition-colors duration-[var(--duration-snap)]">
      <p className="label-caps text-faint">{label}</p>
      <p className="font-mono text-2xl font-semibold tabular-nums text-foreground group-hover:text-accent-text">
        <CountUp to={value} />{suffix ?? ""}
      </p>
    </Link>
  );
}

function Instrument({
  href, label, primary, sub, icon: Icon, tone, dotClass, primaryClass,
}: {
  href: string;
  label: string;
  primary: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "success" | "warning" | "destructive" | "muted";
  dotClass?: string;
  primaryClass?: string;
}) {
  const TONE: Record<"success" | "warning" | "destructive" | "muted", string> = {
    success: "text-success", warning: "text-warning",
    destructive: "text-destructive", muted: "text-faint",
  };
  return (
    <Link
      href={href}
      className="group block rounded-md border border-border bg-card p-3 transition-colors duration-[var(--duration-snap)] hover:border-primary/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <p className="label-caps text-faint inline-flex items-center gap-1.5">
        <Icon className="size-3" /> {label}
      </p>
      <p className={`mt-1 font-mono text-lg font-semibold tabular-nums inline-flex items-center gap-1.5 ${primaryClass ?? (tone ? TONE[tone] : "text-foreground")}`}>
        {dotClass && <span className={`inline-block size-1.5 rounded-full ${dotClass}`} aria-hidden />}
        {primary}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-faint">{sub}</p>}
    </Link>
  );
}

function ActionTile({
  href, icon: Icon, label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="surface-interactive group flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Icon className="size-4 text-faint group-hover:text-foreground" />
      <span className="text-sm font-medium text-foreground group-hover:text-accent-text">{label}</span>
      <ArrowRight className="ml-auto size-3.5 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

// quiet unused-import warnings while keeping the icons available for future moves
void Eye; void Compass;
