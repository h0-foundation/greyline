import { getDb } from '../index';
import { v4 as uuid } from 'uuid';

export interface ThreatModel {
  id: string;
  trip_id: string | null;
  destination_id: string | null;
  assets: string;
  adversaries: string;
  capability: string | null;
  consequence: string | null;
  effort: string | null;
  computed_level: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreatModelInput {
  trip_id?: string | null;
  destination_id?: string | null;
  assets?: string[];
  adversaries?: string[];
  capability?: string;
  consequence?: string;
  effort?: string;
  computed_level?: string;
  notes?: string;
}

export function getThreatModelByTrip(tripId: string): ThreatModel | undefined {
  return getDb()
    .prepare('SELECT * FROM threat_models WHERE trip_id = ? ORDER BY updated_at DESC LIMIT 1')
    .get(tripId) as ThreatModel | undefined;
}

/** One threat model per trip — replace if it already exists. */
export function upsertThreatModel(input: ThreatModelInput): ThreatModel {
  const db = getDb();
  const existing = input.trip_id ? getThreatModelByTrip(input.trip_id) : undefined;
  const id = existing?.id ?? uuid();
  if (existing) {
    db.prepare(
      `UPDATE threat_models SET assets=?, adversaries=?, capability=?, consequence=?, effort=?, computed_level=?, notes=?, updated_at=datetime('now') WHERE id=?`,
    ).run(
      JSON.stringify(input.assets ?? []), JSON.stringify(input.adversaries ?? []),
      input.capability ?? null, input.consequence ?? null, input.effort ?? null,
      input.computed_level ?? null, input.notes ?? null, id,
    );
  } else {
    db.prepare(
      `INSERT INTO threat_models (id, trip_id, destination_id, assets, adversaries, capability, consequence, effort, computed_level, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id, input.trip_id ?? null, input.destination_id ?? null,
      JSON.stringify(input.assets ?? []), JSON.stringify(input.adversaries ?? []),
      input.capability ?? null, input.consequence ?? null, input.effort ?? null,
      input.computed_level ?? null, input.notes ?? null,
    );
  }
  return db.prepare('SELECT * FROM threat_models WHERE id = ?').get(id) as ThreatModel;
}
