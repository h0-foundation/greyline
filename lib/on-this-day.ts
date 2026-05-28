/**
 * "On this day" — trips that share today's month-day across any year. Computes
 * **locally** from the trip table; no calendar data leaves the machine.
 *
 * Day One's #1 organic retention pattern: an ambient daily surface that
 * resurfaces personal history without nagging or requiring a streak.
 */
export type OnThisDayEntry = {
  name: string;
  flag: string;
  year: number;
  tripId: string;
};

type TripDateRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

export function computeOnThisDay(trips: TripDateRow[], now: Date = new Date()): OnThisDayEntry[] {
  const md = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const out: OnThisDayEntry[] = [];
  for (const t of trips) {
    const d = t.start_date ?? t.end_date;
    if (!d || d.slice(5, 10) !== md) continue;
    out.push({ name: t.name, flag: "", year: Number(d.slice(0, 4)), tripId: t.id });
  }
  // Most-recent first — feels natural in conversation.
  out.sort((a, b) => b.year - a.year);
  return out;
}

export function yearsAgo(entry: OnThisDayEntry, now: Date = new Date()): number {
  return now.getUTCFullYear() - entry.year;
}
