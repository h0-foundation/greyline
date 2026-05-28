import { getDb } from '../index';
import { v4 as uuid } from 'uuid';

export interface CreateTripInput {
  name: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface UpdateTripInput {
  name?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export function getAllTrips() {
  return getDb().prepare('SELECT * FROM trips ORDER BY updated_at DESC').all();
}

export function getTripById(id: string) {
  return getDb().prepare('SELECT * FROM trips WHERE id = ?').get(id);
}

export function createTrip(input: CreateTripInput) {
  const id = uuid();
  const db = getDb();
  db.prepare(
    "INSERT INTO trips (id, name, start_date, end_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
  ).run(id, input.name, input.start_date ?? null, input.end_date ?? null, input.notes ?? null);
  return getTripById(id);
}

export function updateTrip(id: string, input: UpdateTripInput) {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return getTripById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE trips SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getTripById(id);
}

export function deleteTrip(id: string) {
  getDb().prepare('DELETE FROM trips WHERE id = ?').run(id);
}

export function getDestinationsByTrip(tripId: string) {
  return getDb().prepare('SELECT * FROM destinations WHERE trip_id = ? ORDER BY sort_order').all(tripId);
}

export function createDestination(tripId: string, input: { country_code?: string; city?: string; lat?: number; lng?: number; arrival_date?: string; departure_date?: string; notes?: string; sort_order?: number }) {
  const id = uuid();
  const db = getDb();
  db.prepare(
    'INSERT INTO destinations (id, trip_id, country_code, city, lat, lng, arrival_date, departure_date, sort_order, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, tripId, input.country_code ?? null, input.city ?? null, input.lat ?? null, input.lng ?? null, input.arrival_date ?? null, input.departure_date ?? null, input.sort_order ?? 0, input.notes ?? null);
  return db.prepare('SELECT * FROM destinations WHERE id = ?').get(id);
}

export function updateDestination(id: string, input: { country_code?: string; city?: string; lat?: number; lng?: number; arrival_date?: string; departure_date?: string; notes?: string; sort_order?: number }) {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return db.prepare('SELECT * FROM destinations WHERE id = ?').get(id);

  values.push(id);
  db.prepare(`UPDATE destinations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM destinations WHERE id = ?').get(id);
}

export function deleteDestination(id: string) {
  getDb().prepare('DELETE FROM destinations WHERE id = ?').run(id);
}
