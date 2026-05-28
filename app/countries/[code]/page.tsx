import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Users,
  Ruler,
  Banknote,
  Languages,
  Phone,
  Car,
  Clock,
  Globe2,
  Siren,
  Plug,
  PlaneTakeoff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getCountryProfile,
  getCountryListRows,
} from "$server/db/repositories/knowledge";
import { getCountryIntel, getCountryPractical } from "$server/db/repositories/intel";
import { getAirportsByCountry } from "$server/db/repositories/airports";
import {
  getAdvisoriesByCountry,
  getCountryIndices,
  getFactbookByCountry,
  decodeFactbook,
} from "$server/db/repositories/dossier";
import { PrivacyPosture } from "@/components/intel/privacy-posture";
import { AdvisoryStack } from "@/components/intel/advisory-stack";
import { IndicesGrid } from "@/components/intel/indices-grid";
import { FactbookPanel } from "@/components/intel/factbook-panel";
import {
  toBriefing,
  buildNeighborIndex,
  formatPopulation,
  formatArea,
} from "@/lib/countries";
import { BookOpen, Gauge } from "lucide-react";

export const dynamic = "force-dynamic";

function Section({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-card p-5 shadow-xs ${className}`}
    >
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
        <Icon className="size-3.5" />
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="font-mono text-sm tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

export default async function CountryBriefingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const profile = getCountryProfile(code.toUpperCase());
  if (!profile) notFound();

  const c = toBriefing(profile.country_code, profile.rest_countries);
  const neighbors = buildNeighborIndex(getCountryListRows());
  const intel = getCountryIntel(profile.country_code);
  const practical = getCountryPractical(profile.country_code);
  const airports = getAirportsByCountry(profile.country_code, 8);
  const advisories = getAdvisoriesByCountry(profile.country_code);
  const indices = getCountryIndices(profile.country_code);
  const factbookRow = getFactbookByCountry(profile.country_code);
  const factbook = factbookRow ? decodeFactbook(factbookRow.data) : null;
  const emergency: Record<string, string> = (() => {
    try { return practical ? JSON.parse(practical.emergency_numbers) : {}; } catch { return {}; }
  })();

  return (
    <div className="space-y-6">
      <Link
        href="/countries"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-accent-text"
      >
        <ArrowLeft className="size-4" />
        All countries
      </Link>

      {/* Editorial dossier header — Fraunces display + mono caption row.
          This is the country's signature moment; the rest of the page is a grid of records. */}
      <header className="space-y-3 border-b border-border pb-7">
        <div className="label-caps flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{c.code}</span>
          <span aria-hidden className="text-faint/60">·</span>
          <span>{c.region}</span>
          {c.subregion && (
            <>
              <span aria-hidden className="text-faint/60">·</span>
              <span>{c.subregion}</span>
            </>
          )}
          {c.unMember && (
            <>
              <span aria-hidden className="text-faint/60">·</span>
              <span>UN member</span>
            </>
          )}
          {c.landlocked && (
            <>
              <span aria-hidden className="text-faint/60">·</span>
              <span>Landlocked</span>
            </>
          )}
        </div>

        <div className="flex items-baseline gap-4 sm:gap-6">
          <span className="text-5xl leading-none sm:text-6xl" aria-hidden>
            {c.flag || "🏳️"}
          </span>
          <h1 className="font-display text-5xl font-semibold leading-[0.95] text-foreground sm:text-7xl">
            {c.name}
          </h1>
        </div>

        <p className="font-mono text-xs text-faint tabular-nums sm:text-sm">
          <span className="text-muted-foreground">{c.official}</span>
          {c.capital.length ? <> · capital <span className="text-foreground">{c.capital.join(", ")}</span></> : null}
          {c.latlng ? <> · <span className="text-foreground">{c.latlng[0].toFixed(2)}°, {c.latlng[1].toFixed(2)}°</span></> : null}
          {c.population ? <> · pop. <span className="text-foreground">{formatPopulation(c.population)}</span></> : null}
        </p>
      </header>

      {/* Travel advisories — multi-source, surfaced first because it's the
          single highest-stakes signal on the page. */}
      <Section title="Travel advisories" icon={Siren} className="!p-5">
        <AdvisoryStack advisories={advisories} />
      </Section>

      {/* Comparable indices — corruption, press freedom, passport reach. */}
      <Section title="Indices" icon={Gauge} className="!p-5">
        <IndicesGrid indices={indices} />
      </Section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Section title="At a glance" icon={MapPin}>
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Capital" value={c.capital.join(", ") || "—"} />
            <Stat
              label="Coordinates"
              value={c.latlng ? `${c.latlng[0].toFixed(1)}, ${c.latlng[1].toFixed(1)}` : "—"}
            />
            <Stat label="Population" value={<span className="inline-flex items-center gap-1.5"><Users className="size-3.5 text-faint" />{formatPopulation(c.population)}</span>} />
            <Stat label="Area" value={<span className="inline-flex items-center gap-1.5"><Ruler className="size-3.5 text-faint" />{formatArea(c.area)}</span>} />
          </dl>
        </Section>

        <Section title="Money" icon={Banknote}>
          {c.currencies.length ? (
            <ul className="space-y-1.5">
              {c.currencies.map((cur) => (
                <li key={cur.code} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-foreground">{cur.name}</span>
                  <span className="font-mono text-faint">
                    {cur.symbol ? `${cur.symbol} ` : ""}{cur.code}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No currency on record.</p>
          )}
        </Section>

        <Section title="Getting around" icon={Car}>
          <dl className="grid grid-cols-2 gap-3">
            <Stat
              label="Drives on"
              value={c.drivingSide ? c.drivingSide[0].toUpperCase() + c.drivingSide.slice(1) : "—"}
            />
            <Stat
              label="Calling code"
              value={<span className="inline-flex items-center gap-1.5"><Phone className="size-3.5 text-faint" />{c.callingCodes.join(", ") || "—"}</span>}
            />
          </dl>
        </Section>

        <Section title="Languages" icon={Languages}>
          {c.languages.length ? (
            <div className="flex flex-wrap gap-1.5">
              {c.languages.map((l) => (
                <Badge key={l} variant="secondary">{l}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No languages on record.</p>
          )}
        </Section>

        <Section title="Time zones" icon={Clock}>
          <div className="flex flex-wrap gap-1.5">
            {c.timezones.length ? (
              c.timezones.map((tz) => (
                <Badge key={tz} variant="outline" className="font-mono">{tz}</Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </Section>

        <Section title="Neighbors" icon={Globe2}>
          {c.borders.length ? (
            <div className="flex flex-wrap gap-1.5">
              {c.borders.map((b) => {
                const n = neighbors.get(b);
                return n ? (
                  <Link key={b} href={`/countries/${n.code}`}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/70">
                      <span aria-hidden>{n.flag}</span> {n.name}
                    </Badge>
                  </Link>
                ) : (
                  <Badge key={b} variant="outline" className="font-mono">{b}</Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {c.landlocked ? "Landlocked, no land borders on record." : "No land borders — island or coastal nation."}
            </p>
          )}
        </Section>

        {/* Arrival card — practical bundled data */}
        <Section title="Arrival" icon={Siren}>
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Police" value={emergency.police || "—"} />
            <Stat label="Ambulance" value={emergency.ambulance || "—"} />
            <Stat label="Fire" value={emergency.fire || "—"} />
            <Stat label="General (EU 112)" value={emergency.general || "—"} />
            {practical && (
              <Stat
                label="Power"
                value={<span className="inline-flex items-center gap-1.5"><Plug className="size-3.5 text-faint" />{[practical.plug_types, practical.voltage, practical.frequency].filter(Boolean).join(" · ") || "—"}</span>}
              />
            )}
            {practical?.cash_declaration && (
              <Stat label="Cash declaration" value={practical.cash_declaration} />
            )}
          </dl>
        </Section>

        {/* Nearest scheduled airports */}
        {airports.length > 0 && (
          <Section title="Airports" icon={PlaneTakeoff}>
            <ul className="space-y-1.5">
              {airports.slice(0, 6).map((a) => (
                <li key={a.ident} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-foreground">{a.name}</span>
                  <span className="shrink-0 font-mono text-xs text-faint">{a.iata_code || a.icao_code || a.ident}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      <PrivacyPosture data={intel} />

      {/* CIA World Factbook highlights — accordion of Government, Economy,
          People, Comms, Transport, Military. */}
      <Section title="World Factbook" icon={BookOpen} className="!p-5">
        <FactbookPanel fb={factbook} />
      </Section>
    </div>
  );
}
