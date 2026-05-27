/** Format a trip's dates honoring how precisely they're known. Old trips logged
 *  only to the month/year render as "Jul 2008" / "~2008", not fake exact dates. */
export type DatePrecision = "day" | "month" | "year" | "unknown";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(d: string): { y: number; m: number; day: number } | null {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: +m[1], m: +m[2], day: +m[3] };
}

export function formatTripDate(
  start: string | null,
  end: string | null,
  precision: DatePrecision = "day",
): string | null {
  const s = start ? parts(start) : null;
  if (!s) return null;
  const e = end ? parts(end) : null;

  if (precision === "year" || precision === "unknown") {
    return s.y === e?.y || !e ? `~${s.y}` : `${s.y}–${e.y}`;
  }
  if (precision === "month") {
    const sLabel = `${MONTHS[s.m - 1]} ${s.y}`;
    if (!e || (e.y === s.y && e.m === s.m)) return sLabel;
    const eLabel = `${MONTHS[e.m - 1]} ${e.y}`;
    return s.y === e.y ? `${MONTHS[s.m - 1]}–${MONTHS[e.m - 1]} ${s.y}` : `${sLabel} – ${eLabel}`;
  }
  // day precision
  const fmt = (p: { y: number; m: number; day: number }) => `${MONTHS[p.m - 1]} ${p.day}, ${p.y}`;
  if (!e) return fmt(s);
  if (e.y === s.y && e.m === s.m && e.day === s.day) return fmt(s);
  return `${fmt(s)} – ${fmt(e)}`;
}

/** Day count, or "—" when the trip is a single coarse-precision point (unknown). */
export function tripDaysLabel(
  start: string | null,
  end: string | null,
  precision: DatePrecision = "day",
): string {
  if (!start) return "—";
  const startMs = Date.parse(start);
  const endMs = end ? Date.parse(end) : startMs;
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "—";
  // A month/year-precision single point means the duration is genuinely unknown.
  if (precision !== "day" && endMs === startMs) return "—";
  const days = Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1);
  return `${days}d`;
}
