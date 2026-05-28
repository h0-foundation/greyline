// Trip Briefing — auto-baked per-destination dossier. Server-rendered; pulls
// from advisories + indices + intel + practical + visa repos. Sits at the top
// of the trip detail page so the moment a destination is added the user gets
// the full picture without clicking through every tool.

import Link from "next/link";
import {
  ShieldAlert, BookOpenText, FileText, Banknote, Stamp, PlaneTakeoff,
  Eye, Siren, ExternalLink, CloudSun, Calendar, Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AdvisoryRow, CountryIndices, PeakAdvisory } from "$server/db/repositories/dossier";

// ── inputs (server-fetched) ─────────────────────────────────────────────────
export type BriefingDestination = {
  id: string;
  country_code: string | null;
  city: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  lat: number | null;
  lng: number | null;
};

export type DestinationBriefing = {
  countryCode: string | null;
  countryName: string;
  flag: string;
  advisories: AdvisoryRow[];        // every source
  peak: PeakAdvisory | null;        // worst across sources
  indices: CountryIndices | null;
  intel: {
    photography_note: string | null;
    decryption_compulsion: string | null;
    sim_registration: string | null;
    vpn_legality: string | null;
    apis_pnr_note: string | null;
    biometric_entry_note: string | null;
    lgbtq_legal_risk: string | null;
  } | null;
  practical: {
    emergency_numbers: string | null;
    plug_types: string | null;
    voltage: string | null;
    driving_side: string | null;
    cash_declaration: string | null;
    idp_required: number | null;
  } | null;
  visa: { requirement: string; detail: string | null } | null;
  airports: Array<{ name: string; iata: string | null; icao: string | null }>;
};

export type BriefingPayload = {
  destinations: Array<BriefingDestination & { briefing: DestinationBriefing }>;
  home: { iso2: string | null; currencyCode: string | null };
  rates: Record<string, number> | null;
  preDeparture: string[];
};

const LEVEL_TONE: Record<number, { dot: string; chip: string; text: string; ring: string; label: string }> = {
  1: { dot: "bg-success",      chip: "bg-success/10 text-success",      text: "text-success",      ring: "ring-success/30",      label: "Normal precautions" },
  2: { dot: "bg-warning",      chip: "bg-warning/10 text-warning",      text: "text-warning",      ring: "ring-warning/30",      label: "Increased caution" },
  3: { dot: "bg-accent-text",  chip: "bg-accent-text/12 text-accent-text", text: "text-accent-text", ring: "ring-accent-text/35", label: "Reconsider travel" },
  4: { dot: "bg-destructive",  chip: "bg-destructive/12 text-destructive", text: "text-destructive", ring: "ring-destructive/40", label: "Do not travel" },
};

const VISA_LABEL: Record<string, string> = {
  visa_free: "Visa-free",
  visa_on_arrival: "Visa on arrival",
  eta: "ETA",
  e_visa: "e-Visa",
  visa_required: "Visa required",
  no_admission: "No admission",
  home: "Home country",
};

const VISA_TONE: Record<string, "success" | "warning" | "destructive"> = {
  visa_free: "success",
  visa_on_arrival: "warning",
  eta: "warning",
  e_visa: "warning",
  visa_required: "destructive",
  no_admission: "destructive",
  home: "success",
};

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const start = Date.parse(a), end = Date.parse(b);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function tone(level: number) { return LEVEL_TONE[level] ?? LEVEL_TONE[1]; }

export function TripBriefing({ payload }: { payload: BriefingPayload }) {
  if (payload.destinations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a destination above and the briefing fills in automatically.
      </p>
    );
  }
  // Roll-up: worst advisory across all destinations.
  const peakLevel = Math.max(
    1,
    ...payload.destinations.map((d) => d.briefing.peak?.level ?? 1),
  );
  const peak = tone(peakLevel);
  const uniqCountries = new Set(payload.destinations.map((d) => d.country_code).filter(Boolean)).size;
  const totalDays = payload.destinations
    .map((d) => daysBetween(d.arrival_date, d.departure_date) ?? 0)
    .reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      {/* ── Roll-up bar ─ */}
      <div className={`rounded-xl border border-border bg-card p-4 ring-1 ring-inset ${peak.ring} surface-raised`}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2.5">
            <span className={`inline-block size-2.5 rounded-full ${peak.dot}`} aria-hidden />
            <span className={`text-sm font-medium ${peak.text}`}>
              Peak advisory · Level {peakLevel} {peakLevel > 1 ? `(${peak.label})` : "— routine"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Layers className="size-4 text-faint" />
            {payload.destinations.length} destination{payload.destinations.length === 1 ? "" : "s"} · {uniqCountries} countr{uniqCountries === 1 ? "y" : "ies"}
          </div>
          {totalDays > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="size-4 text-faint" />
              <span className="font-mono tabular-nums">{totalDays}</span> day{totalDays === 1 ? "" : "s"} abroad
            </div>
          )}
        </div>
      </div>

      {/* ── Per-destination cards ─ */}
      <div className="space-y-4">
        {payload.destinations.map((d) => {
          const b = d.briefing;
          const cardTone = b.peak ? tone(b.peak.level) : tone(1);
          const days = daysBetween(d.arrival_date, d.departure_date);
          const rate =
            payload.home.currencyCode && payload.rates && d.country_code
              ? payload.rates[d.country_code as keyof typeof payload.rates]
              : undefined;
          return (
            <article
              key={d.id}
              className={`rounded-xl border border-border bg-card p-5 surface-raised ring-1 ring-inset ${cardTone.ring}`}
            >
              {/* Card header */}
              <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl leading-none" aria-hidden>{b.flag || "🏳️"}</span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-foreground">
                      {b.countryName}
                      {d.city && <span className="text-muted-foreground"> · {d.city}</span>}
                    </h3>
                    <p className="font-mono text-xs text-faint tabular-nums">
                      {[d.arrival_date, d.departure_date].filter(Boolean).join(" → ") || "no dates set"}
                      {days ? ` · ${days}d` : ""}
                    </p>
                  </div>
                </div>
                {d.country_code && (
                  <Link
                    href={`/countries/${d.country_code}`}
                    className="inline-flex items-center gap-1 text-xs text-accent-text hover:underline"
                  >
                    Full dossier <ExternalLink className="size-3" />
                  </Link>
                )}
              </header>

              <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Advisories column */}
                <section className="space-y-2.5">
                  <p className="label-caps text-faint inline-flex items-center gap-1.5"><ShieldAlert className="size-3" /> Advisory</p>
                  {b.advisories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No advisory on file.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {b.advisories.map((a) => {
                        const t = tone(a.level);
                        return (
                          <li key={a.source} className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                              <span className={`inline-block size-1.5 rounded-full ${t.dot}`} aria-hidden />
                              {a.source === "us_state" ? "US" : a.source === "uk_fcdo" ? "UK" : a.source}
                            </span>
                            <span className={`font-mono text-xs tabular-nums ${t.text}`}>L{a.level}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {b.peak && b.peak.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-3 text-pretty">{b.peak.summary}</p>
                  )}
                </section>

                {/* Entry column */}
                <section className="space-y-2.5">
                  <p className="label-caps text-faint inline-flex items-center gap-1.5"><Stamp className="size-3" /> Entry &amp; cash</p>
                  {b.visa ? (
                    <p className="flex items-center gap-2 text-sm">
                      <Badge variant={VISA_TONE[b.visa.requirement] === "destructive" ? "destructive" : VISA_TONE[b.visa.requirement] === "warning" ? "secondary" : "outline"}>
                        {VISA_LABEL[b.visa.requirement] ?? b.visa.requirement}
                      </Badge>
                      {b.visa.detail && (
                        <span className="font-mono text-xs text-faint">{b.visa.detail}{/^\d+$/.test(b.visa.detail) ? "d" : ""}</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No matrix row for your passport → {b.countryCode}.</p>
                  )}
                  {b.practical?.cash_declaration && (
                    <p className="text-xs text-muted-foreground">
                      <span className="text-faint">Cash declare: </span>
                      <span className="text-foreground">{b.practical.cash_declaration}</span>
                    </p>
                  )}
                  {rate && payload.home.currencyCode && (
                    <p className="text-xs text-muted-foreground">
                      <span className="text-faint">1 {payload.home.currencyCode} = </span>
                      <span className="font-mono tabular-nums text-foreground">{rate.toFixed(rate < 10 ? 4 : 2)}</span>
                      <span className="text-faint"> · local</span>
                    </p>
                  )}
                </section>

                {/* Posture column */}
                <section className="space-y-2.5">
                  <p className="label-caps text-faint inline-flex items-center gap-1.5"><Eye className="size-3" /> Posture</p>
                  {b.intel ? (
                    <ul className="space-y-1.5 text-xs">
                      {b.intel.vpn_legality && (
                        <li className="flex items-baseline justify-between gap-2"><span className="text-faint">VPN</span><span className="capitalize text-foreground">{b.intel.vpn_legality}</span></li>
                      )}
                      {b.intel.sim_registration && (
                        <li className="flex items-baseline justify-between gap-2"><span className="text-faint">SIM</span><span className="capitalize text-foreground">{b.intel.sim_registration}</span></li>
                      )}
                      {b.intel.decryption_compulsion && (
                        <li className="flex items-baseline justify-between gap-2"><span className="text-faint">Device unlock</span><span className="capitalize text-foreground">{b.intel.decryption_compulsion}</span></li>
                      )}
                      {b.intel.lgbtq_legal_risk && (
                        <li className="flex items-baseline justify-between gap-2"><span className="text-faint">LGBTQ+ risk</span><span className="capitalize text-foreground">{b.intel.lgbtq_legal_risk}</span></li>
                      )}
                      {b.intel.photography_note && (
                        <li className="text-muted-foreground line-clamp-2">{b.intel.photography_note}</li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No intel on file.</p>
                  )}
                </section>
              </div>

              {/* Footer row — practical numbers + airports */}
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="label-caps text-faint inline-flex items-center gap-1.5"><Siren className="size-3" /> Practical</p>
                  <p className="text-xs text-muted-foreground">
                    {b.practical?.plug_types && <>Plug <span className="text-foreground">{b.practical.plug_types}</span> · {b.practical.voltage}</>}
                    {b.practical?.driving_side && <> · drives <span className="text-foreground">{b.practical.driving_side}</span></>}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="label-caps text-faint inline-flex items-center gap-1.5"><PlaneTakeoff className="size-3" /> Airports</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {b.airports.length === 0
                      ? "—"
                      : b.airports.slice(0, 4).map((a) => a.iata || a.icao).filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ── Pre-departure checklist ─ */}
      {payload.preDeparture.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5 surface-raised">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
            <FileText className="size-3.5" /> Pre-departure checklist
            <Badge variant="outline" className="font-mono">auto</Badge>
          </h3>
          <ul className="mt-3 space-y-1.5">
            {payload.preDeparture.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span aria-hidden className="mt-1.5 inline-block size-1.5 rounded-full bg-accent-text shrink-0" />
                <span className="text-foreground">{it}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Quick links into the deeper tools */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <Link href="/tools/weather" className="inline-flex items-center gap-1 hover:text-accent-text"><CloudSun className="size-3.5" /> Weather forecast</Link>
        <Link href="/tools/border" className="inline-flex items-center gap-1 hover:text-accent-text"><BookOpenText className="size-3.5" /> Border crossing kit</Link>
        <Link href="/tools/packing" className="inline-flex items-center gap-1 hover:text-accent-text"><Banknote className="size-3.5" /> Packing</Link>
      </div>
    </div>
  );
}
