import { getDb } from '../index';
import { v4 as uuid } from 'uuid';

export interface ChecklistRow {
  id: string;
  trip_id: string | null;
  destination_id: string | null;
  type: string;
  name: string;
  items: string; // JSON string
  created_at: string;
  updated_at: string;
}

export function getChecklistsByTrip(tripId: string): ChecklistRow[] {
  return getDb().prepare('SELECT * FROM checklists WHERE trip_id = ? ORDER BY type, name').all(tripId) as ChecklistRow[];
}

export function getChecklistsByDestination(destinationId: string): ChecklistRow[] {
  return getDb().prepare('SELECT * FROM checklists WHERE destination_id = ? ORDER BY type, name').all(destinationId) as ChecklistRow[];
}

export function getChecklistById(id: string): ChecklistRow | undefined {
  return getDb().prepare('SELECT * FROM checklists WHERE id = ?').get(id) as ChecklistRow | undefined;
}

export function createChecklist(input: {
  trip_id?: string;
  destination_id?: string;
  type: string;
  name: string;
  items: Array<{ id: string; label: string; checked: boolean; notes?: string }>;
}): ChecklistRow {
  const id = uuid();
  getDb().prepare(
    "INSERT INTO checklists (id, trip_id, destination_id, type, name, items, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
  ).run(id, input.trip_id ?? null, input.destination_id ?? null, input.type, input.name, JSON.stringify(input.items));
  return getChecklistById(id)!;
}

export function updateChecklistItems(id: string, items: Array<{ id: string; label: string; checked: boolean; notes?: string }>): ChecklistRow | undefined {
  getDb().prepare("UPDATE checklists SET items = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(items), id);
  return getChecklistById(id);
}

export function deleteChecklist(id: string): void {
  getDb().prepare('DELETE FROM checklists WHERE id = ?').run(id);
}

export function deleteChecklistsByDestination(destinationId: string): void {
  getDb().prepare('DELETE FROM checklists WHERE destination_id = ?').run(destinationId);
}
