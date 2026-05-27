/**
 * Visa compliance math — pure functions, no dependencies.
 *
 * Two calculators live here:
 *   1. Schengen 90/180 rolling-window calculator (EU Regulation 610/2013).
 *   2. Passport 6-month (Schengen 3-month) validity checker.
 *
 * Everything works in UTC "epoch days" — the integer count of whole days since
 * the Unix epoch. Working in integers (not Date objects) sidesteps timezone
 * offsets, daylight-saving shifts, and leap-second/leap-day arithmetic bugs.
 */

// --- Schengen membership -----------------------------------------------------

/**
 * The 29 states that apply the Schengen acquis to short-stay border control,
 * by ISO 3166-1 alpha-2. This is the set the 90/180 rule is counted across.
 *
 * Current as of 2025: the 27 long-standing members plus Croatia (HR, 2023) and
 * Bulgaria + Romania (BG, RO — full land-border controls lifted 2025-01-01).
 * Cyprus (CY) and Ireland (IE) are NOT in Schengen and are intentionally absent.
 * Microstates that share borders de facto (Monaco, San Marino, Vatican,
 * Andorra) are not listed — they are not formal members.
 */
export const SCHENGEN_ISO2: ReadonlySet<string> = new Set([
  "AT", // Austria
  "BE", // Belgium
  "BG", // Bulgaria (2025)
  "HR", // Croatia (2023)
  "CZ", // Czechia
  "DK", // Denmark
  "EE", // Estonia
  "FI", // Finland
  "FR", // France
  "DE", // Germany
  "GR", // Greece
  "HU", // Hungary
  "IS", // Iceland
  "IT", // Italy
  "LV", // Latvia
  "LI", // Liechtenstein
  "LT", // Lithuania
  "LU", // Luxembourg
  "MT", // Malta
  "NL", // Netherlands
  "NO", // Norway
  "PL", // Poland
  "PT", // Portugal
  "RO", // Romania (2025)
  "SK", // Slovakia
  "SI", // Slovenia
  "ES", // Spain
  "SE", // Sweden
  "CH", // Switzerland
]);

/** True if the ISO2 country applies the Schengen short-stay rule. */
export function isSchengen(iso2: string | null | undefined): boolean {
  return iso2 != null && SCHENGEN_ISO2.has(iso2.toUpperCase());
}

// --- Epoch-day primitives ----------------------------------------------------

const MS_PER_DAY = 86_400_000;

/**
 * Convert a `YYYY-MM-DD` string (the value an <input type="date"> produces) to
 * an integer epoch day. Returns null for empty/malformed input so callers can
 * treat partial form state gracefully.
 */
export function epochDay(isoDate: string): number | null {
  // Match strictly: a date input only ever yields zero-padded YYYY-MM-DD.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  // Date.UTC normalizes the calendar; floor against MS_PER_DAY gives the day.
  const ms = Date.UTC(y, mo - 1, d);
  // Guard against rollover (e.g. Feb 31 -> Mar): re-derive and compare.
  const back = new Date(ms);
  if (back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return Math.floor(ms / MS_PER_DAY);
}

/** Convert an epoch day back to a `YYYY-MM-DD` string. */
export function fromEpochDay(day: number): string {
  const d = new Date(day * MS_PER_DAY);
  const y = d.getUTCFullYear().toString().padStart(4, "0");
  const mo = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const da = d.getUTCDate().toString().padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Today as an epoch day, in UTC. */
export function todayEpochDay(): number {
  return Math.floor(Date.now() / MS_PER_DAY);
}

/**
 * Add a number of whole calendar months to an epoch day, clamping the day of
 * month when the target month is shorter (e.g. Jan 31 + 1mo -> Feb 28/29).
 * Used for passport-validity rules expressed in months.
 */
export function addMonths(day: number, months: number): number {
  const d = new Date(day * MS_PER_DAY);
  const targetMonth = d.getUTCMonth() + months;
  const result = new Date(
    Date.UTC(d.getUTCFullYear(), targetMonth, 1),
  );
  // Clamp the day to the last valid day of the target month.
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return Math.floor(result.getTime() / MS_PER_DAY);
}

// --- Schengen 90/180 ---------------------------------------------------------

/** A single stay; both endpoints are inclusive epoch days. */
export type Stay = { entry: number; exit: number };

/**
 * Inclusive overlap (in whole days) between a stay and a window, where every
 * day from `entry` to `exit` inclusive counts as a day of presence.
 */
function overlapDays(
  stay: Stay,
  windowStart: number,
  windowEnd: number,
): number {
  const start = Math.max(stay.entry, windowStart);
  const end = Math.min(stay.exit, windowEnd);
  if (end < start) return 0;
  return end - start + 1; // inclusive of both endpoints
}

/** Total days of presence inside the 180-day window ending at `queryDate`. */
function usedInWindow(stays: Stay[], queryDate: number): number {
  const windowStart = queryDate - 179; // [D-179, D] is exactly 180 days
  let used = 0;
  for (const s of stays) {
    if (s.exit < s.entry) continue; // skip incoherent rows
    used += overlapDays(s, windowStart, queryDate);
  }
  return used;
}

export type SchengenStatus = {
  /** Days of presence counted in the rolling 180-day window. */
  used: number;
  /** 90 − used (can go negative when over the limit). */
  remaining: number;
  /** True when used ≤ 90. */
  compliant: boolean;
  /** First day of the rolling window (epoch day). */
  windowStart: number;
  /** The query date itself (epoch day). */
  windowEnd: number;
  /**
   * When already over 90, the earliest future day on which a NEW entry would
   * be compliant (i.e. enough old days have aged out of the window). Null when
   * already compliant.
   */
  earliestReentry: number | null;
};

/**
 * Evaluate Schengen 90/180 status for a query date.
 *
 * The window is [queryDate − 179, queryDate] (180 days). `used` is the total
 * inclusive presence across all stays in that window; you are compliant while
 * `used ≤ 90`.
 *
 * `earliestReentry` (only when currently over) brute-forces forward one day at
 * a time from the query date until the window's `used` count — assuming you
 * make NO further entries — drops to 90 or below, i.e. the first day you could
 * legally re-enter. Day iteration is bounded (old days always age out within
 * 180 days) so the loop terminates well before the cap.
 */
export function schengenStatus(
  stays: Stay[],
  queryDate: number,
): SchengenStatus {
  const used = usedInWindow(stays, queryDate);
  const remaining = 90 - used;
  const compliant = used <= 90;

  let earliestReentry: number | null = null;
  if (!compliant) {
    // Search forward. A re-entry on day D is "compliant" if the existing
    // presence in [D-179, D] is ≤ 89, leaving room for at least one new day.
    // Cap at 180 iterations past the query date — the entire window turns over
    // within that span, guaranteeing termination.
    for (let d = queryDate + 1; d <= queryDate + 180; d++) {
      if (usedInWindow(stays, d) <= 89) {
        earliestReentry = d;
        break;
      }
    }
  }

  return {
    used,
    remaining,
    compliant,
    windowStart: queryDate - 179,
    windowEnd: queryDate,
    earliestReentry,
  };
}

// --- Passport validity -------------------------------------------------------

export type PassportValidity = {
  /** True when the passport satisfies the destination's validity rule. */
  ok: boolean;
  /** Months of validity the destination requires beyond entry (3 or 6). */
  ruleMonths: number;
  /** The date (epoch day) the passport must remain valid until. */
  requiredUntil: number;
  /**
   * True when, although currently valid enough, the passport expires within
   * ~9 months — flagging that routine renewal (≈6–8 weeks) should begin soon.
   */
  renewSoon: boolean;
};

/**
 * Check whether a passport meets a destination's validity requirement.
 *
 * Default rule: valid ≥ 6 months beyond the planned entry date (the common
 * international standard). Schengen destinations use ≥ 3 months beyond the
 * planned departure; lacking a departure date here we conservatively apply the
 * 3-month rule from the entry date.
 *
 * `renewSoon` fires when the passport expires within 9 months of today, since
 * routine renewals take roughly 6–8 weeks and the 6-month rule erodes usable
 * validity well before the printed expiry.
 */
export function passportValidity({
  expiry,
  entry,
  destIso2,
}: {
  expiry: number;
  entry: number;
  destIso2: string | null | undefined;
}): PassportValidity {
  const ruleMonths = isSchengen(destIso2) ? 3 : 6;
  const requiredUntil = addMonths(entry, ruleMonths);
  const ok = expiry >= requiredUntil;
  const renewSoon = expiry < addMonths(todayEpochDay(), 9);
  return { ok, ruleMonths, requiredUntil, renewSoon };
}
