import { getDb } from '../index';
import { v4 as uuid } from 'uuid';

// ── Counter-surveillance log (TEDD: Time, Environment, Distance, Demeanor) ──
export interface Sighting {
  id: string;
  timestamp: string;
  lat: number | null;
  lng: number | null;
  description: string | null;
  person_desc: string | null;
  vehicle_desc: string | null;
  threat_level: string;
  tags: string;
  linked_ids: string;
}

export function getSightings(): Sighting[] {
  return getDb().prepare('SELECT * FROM counter_surveillance_log ORDER BY timestamp DESC').all() as Sighting[];
}

export function createSighting(input: {
  lat?: number | null; lng?: number | null; description?: string;
  person_desc?: string; vehicle_desc?: string; threat_level?: string; tags?: string[];
}): Sighting {
  const id = uuid();
  getDb().prepare(
    `INSERT INTO counter_surveillance_log (id, lat, lng, description, person_desc, vehicle_desc, threat_level, tags)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).run(
    id, input.lat ?? null, input.lng ?? null, input.description ?? null,
    input.person_desc ?? null, input.vehicle_desc ?? null,
    input.threat_level ?? 'low', JSON.stringify(input.tags ?? []),
  );
  return getDb().prepare('SELECT * FROM counter_surveillance_log WHERE id = ?').get(id) as Sighting;
}

export function deleteSighting(id: string): void {
  getDb().prepare('DELETE FROM counter_surveillance_log WHERE id = ?').run(id);
}

/** TEDD heuristic: flag person/vehicle descriptions that recur across sightings —
 *  the core counter-surveillance signal (same party over time/environments). */
export function repeatMatches(): { key: string; count: number }[] {
  const rows = getSightings();
  const tally = new Map<string, number>();
  for (const s of rows) {
    for (const d of [s.person_desc, s.vehicle_desc]) {
      const k = (d ?? '').trim().toLowerCase();
      if (k.length >= 3) tally.set(k, (tally.get(k) ?? 0) + 1);
    }
  }
  return [...tally.entries()].filter(([, n]) => n > 1).map(([key, count]) => ({ key, count }));
}

// ── Rally points (emergency RV) ──
export interface RallyPoint {
  id: string;
  trip_id: string | null;
  name: string;
  lat: number;
  lng: number;
  time_start: string | null;
  time_end: string | null;
  fallback_id: string | null;
  instructions: string | null;
}

export function getRallyPoints(tripId?: string): RallyPoint[] {
  const db = getDb();
  if (tripId) return db.prepare('SELECT * FROM rally_points WHERE trip_id = ?').all(tripId) as RallyPoint[];
  return db.prepare('SELECT * FROM rally_points ORDER BY name').all() as RallyPoint[];
}

export function createRallyPoint(input: {
  trip_id?: string | null; name: string; lat: number; lng: number;
  time_start?: string; time_end?: string; instructions?: string;
}): RallyPoint {
  const id = uuid();
  getDb().prepare(
    `INSERT INTO rally_points (id, trip_id, name, lat, lng, time_start, time_end, instructions)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).run(
    id, input.trip_id ?? null, input.name, input.lat, input.lng,
    input.time_start ?? null, input.time_end ?? null, input.instructions ?? null,
  );
  return getDb().prepare('SELECT * FROM rally_points WHERE id = ?').get(id) as RallyPoint;
}

export function deleteRallyPoint(id: string): void {
  getDb().prepare('DELETE FROM rally_points WHERE id = ?').run(id);
}
