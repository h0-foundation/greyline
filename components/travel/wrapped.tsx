"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Sparkles, Plane, CalendarClock, Globe2, Compass, ChevronDown } from "lucide-react";
import { CountUp } from "@/components/count-up";
import { TRANSITION } from "@/lib/motion";
import type { YearInReview } from "$server/db/repositories/travel";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function Wrapped({ reviews }: { reviews: YearInReview[] }) {
  const reduce = useReducedMotion();
  const years = reviews.map((r) => r.year);
  // Default to the most recent *completed* year (the natural recap), not the
  // partial current year; fall back to the latest year on record.
  const thisYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(years.find((y) => y < thisYear) ?? years[0]);
  const r = reviews.find((x) => x.year === year);

  if (!r || !r.hasData) return null;

  const rise = reduce
    ? {}
    : { initial: { opacity: 0, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-40px" } };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent-subtle/50 via-card to-card p-6 shadow-xs sm:p-8">
      {/* subtle spark glow, top-right */}
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-spark/10 blur-3xl" />

      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent-text">
            <Sparkles className="size-3.5" /> Greyline Wrapped
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {r.year}
          </h2>
        </div>

        {years.length > 1 && (
          <label className="relative inline-flex items-center">
            <span className="sr-only">Choose year</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="appearance-none rounded-md border border-border bg-card py-1.5 pl-3 pr-8 font-mono text-sm tabular-nums text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-faint" />
          </label>
        )}
      </div>

      {/* Headline numbers */}
      <motion.div {...rise} transition={TRANSITION.slow} className="relative mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Big icon={Globe2} value={r.countries.length} label={r.countries.length === 1 ? "country" : "countries"} />
        <Big icon={Plane} value={r.trips} label={r.trips === 1 ? "trip" : "trips"} />
        <Big icon={CalendarClock} value={r.days} label="days abroad" />
        <Big icon={Compass} value={r.newCountries} label="new flags" highlight />
      </motion.div>

      {/* Narrative line */}
      <motion.p {...rise} transition={{ ...TRANSITION.slow, delay: 0.08 }} className="relative mt-6 max-w-prose text-pretty text-sm leading-relaxed text-muted-foreground">
        {narrative(r)}
      </motion.p>

      {/* Country chips, biggest first; new ones sparked */}
      {r.countries.length > 0 && (
        <motion.ul {...rise} transition={{ ...TRANSITION.slow, delay: 0.16 }} className="relative mt-5 flex flex-wrap gap-2">
          {r.countries.map((c) => (
            <li
              key={c.code}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                c.isNew ? "border-spark/40 bg-spark/10 text-foreground" : "border-border bg-card text-muted-foreground"
              }`}
              title={`${c.days} day${c.days === 1 ? "" : "s"}${c.isNew ? " · first visit" : ""}`}
            >
              {c.flag && <span aria-hidden>{c.flag}</span>}
              {c.name}
              {c.isNew && <Sparkles className="size-3 text-spark" aria-label="first visit" />}
            </li>
          ))}
        </motion.ul>
      )}

      {/* Footnote highlights */}
      <motion.div {...rise} transition={{ ...TRANSITION.slow, delay: 0.24 }} className="relative mt-6 grid gap-3 border-t border-border pt-5 text-sm sm:grid-cols-2">
        {r.longestTrip && (
          <Highlight label="Longest trip">
            <Link href={`/trips/${r.longestTrip.tripId}`} className="text-accent-text hover:underline">
              {r.longestTrip.name}
            </Link>{" "}
            <span className="text-faint">· {r.longestTrip.days} days</span>
          </Highlight>
        )}
        {r.busiestMonth && (
          <Highlight label="Busiest month">
            <span className="text-foreground">{MONTHS[r.busiestMonth.month]}</span>{" "}
            <span className="text-faint">· {r.busiestMonth.days} days away</span>
          </Highlight>
        )}
      </motion.div>
    </section>
  );
}

function narrative(r: YearInReview): string {
  const parts: string[] = [];
  parts.push(
    `In ${r.year} you spent ${r.days} day${r.days === 1 ? "" : "s"} away across ${r.countries.length} countr${r.countries.length === 1 ? "y" : "ies"}.`,
  );
  if (r.newCountries > 0) {
    parts.push(`${r.newCountries} ${r.newCountries === 1 ? "was a flag" : "were flags"} you'd never set foot in before.`);
  }
  if (r.farthest) parts.push(`Your longest stay was ${r.farthest.flag ? r.farthest.flag + " " : ""}${r.farthest.name}.`);
  return parts.join(" ");
}

function Big({ icon: Icon, value, label, highlight }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string; highlight?: boolean }) {
  return (
    <div>
      <Icon className={`size-4 ${highlight ? "text-spark" : "text-faint"}`} />
      <div className={`mt-2 font-mono text-4xl font-bold tabular-nums ${highlight ? "text-spark" : "text-foreground"}`}>
        <CountUp to={value} />
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Highlight({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-faint">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
