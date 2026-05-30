/* Multi-traveler roster — pure duty-of-care helpers.
 *
 * The DB/repository handles persistence; this module holds the small,
 * deterministic logic worth unit-testing: check-in status derivation and roster
 * summarisation. No DB, no DOM, no Date (pass `now` in epoch ms). */

export type CheckinStatus = "ok" | "overdue" | "sos" | "unknown";

export interface Traveler {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  emergency_contact: string | null;
  blood_type: string | null;
  notes: string | null;
  checkin_status: CheckinStatus;
  last_checkin: string | null;
  created_at: string;
  updated_at: string;
}

export const CHECKIN_LABEL: Record<CheckinStatus, string> = {
  ok: "Checked in",
  overdue: "Overdue",
  sos: "SOS",
  unknown: "No check-in",
};

/** Display order: SOS first, then overdue, then unknown, then ok (calmest last). */
export const CHECKIN_SEVERITY: Record<CheckinStatus, number> = {
  sos: 3,
  overdue: 2,
  unknown: 1,
  ok: 0,
};

/**
 * Derive a live check-in status from the stored status + elapsed time. An
 * explicit `sos` always wins. Otherwise a traveller who last checked in longer
 * ago than `overdueAfterMs` is `overdue`; a recent check-in is `ok`; no
 * check-in at all is `unknown`. Pure — pass `now` and the interval in.
 */
export function deriveCheckinStatus(
  stored: CheckinStatus,
  lastCheckinMs: number | null,
  nowMs: number,
  overdueAfterMs: number,
): CheckinStatus {
  if (stored === "sos") return "sos";
  if (lastCheckinMs === null) return "unknown";
  if (nowMs - lastCheckinMs > overdueAfterMs) return "overdue";
  return "ok";
}

export interface RosterSummary {
  total: number;
  ok: number;
  overdue: number;
  sos: number;
  unknown: number;
  /** True when anyone needs attention (sos or overdue). */
  needsAttention: boolean;
}

export function summarizeRoster(statuses: CheckinStatus[]): RosterSummary {
  const s: RosterSummary = { total: statuses.length, ok: 0, overdue: 0, sos: 0, unknown: 0, needsAttention: false };
  for (const st of statuses) s[st]++;
  s.needsAttention = s.sos > 0 || s.overdue > 0;
  return s;
}

/** Sort travellers most-urgent-first (SOS → overdue → unknown → ok), then name. */
export function sortByUrgency<T extends { checkin_status: CheckinStatus; name: string }>(travelers: T[]): T[] {
  return [...travelers].sort(
    (a, b) =>
      CHECKIN_SEVERITY[b.checkin_status] - CHECKIN_SEVERITY[a.checkin_status] ||
      a.name.localeCompare(b.name),
  );
}
