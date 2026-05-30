import { getDb } from "../index";
import { v4 as uuid } from "uuid";
import type { Traveler, CheckinStatus } from "@/lib/roster";

// Multi-traveler roster persistence. Local-only. Column writes go through an
// allowlist so no caller key reaches SQL as an identifier (mirrors trip.ts).

const STATUS_VALUES: CheckinStatus[] = ["ok", "overdue", "sos", "unknown"];
const UPDATABLE = new Set([
  "name", "role", "email", "phone", "emergency_contact", "blood_type", "notes",
]);

export function listTravelers(): Traveler[] {
  return getDb().prepare("SELECT * FROM travelers ORDER BY name").all() as Traveler[];
}

export function getTraveler(id: string): Traveler | null {
  return (getDb().prepare("SELECT * FROM travelers WHERE id = ?").get(id) as Traveler) ?? null;
}

export function createTraveler(input: {
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  emergency_contact?: string | null;
  blood_type?: string | null;
  notes?: string | null;
}): Traveler {
  const name = (input.name ?? "").trim();
  if (!name) throw new Error("name required");
  const id = uuid();
  getDb()
    .prepare(
      `INSERT INTO travelers (id, name, role, email, phone, emergency_contact, blood_type, notes)
       VALUES (?,?,?,?,?,?,?,?)`,
    )
    .run(
      id,
      name,
      input.role?.trim() || null,
      input.email?.trim() || null,
      input.phone?.trim() || null,
      input.emergency_contact?.trim() || null,
      input.blood_type?.trim() || null,
      input.notes?.trim() || null,
    );
  return getTraveler(id)!;
}

export function updateTraveler(id: string, fields: Record<string, unknown>): Traveler | null {
  if (!getTraveler(id)) return null;
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (!UPDATABLE.has(k)) continue; // allowlist guards against SQL identifier injection
    sets.push(`${k} = ?`);
    values.push(typeof v === "string" ? v.trim() || null : v);
  }
  if (sets.length === 0) return getTraveler(id);
  values.push(id);
  getDb()
    .prepare(`UPDATE travelers SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`)
    .run(...values);
  return getTraveler(id);
}

/** Record a check-in (or SOS). 'ok'/'overdue'/'unknown' stamp last_checkin; 'sos'
 *  sets the status without touching the timestamp (it's an alarm, not a check-in). */
export function setCheckin(id: string, status: CheckinStatus): Traveler | null {
  if (!STATUS_VALUES.includes(status)) throw new Error("invalid check-in status");
  if (!getTraveler(id)) return null;
  if (status === "sos") {
    getDb().prepare("UPDATE travelers SET checkin_status = 'sos', updated_at = datetime('now') WHERE id = ?").run(id);
  } else {
    getDb()
      .prepare("UPDATE travelers SET checkin_status = ?, last_checkin = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(status, id);
  }
  return getTraveler(id);
}

export function deleteTraveler(id: string): void {
  getDb().prepare("DELETE FROM travelers WHERE id = ?").run(id);
}
