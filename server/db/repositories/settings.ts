import { getDb } from '../index';

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
  ).run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export function getApiToggles(): { api_id: string; enabled: boolean; use_tor: boolean }[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM api_toggles').all() as { api_id: string; enabled: number; use_tor: number }[];
  return rows.map(r => ({ api_id: r.api_id, enabled: r.enabled === 1, use_tor: r.use_tor === 1 }));
}

export function setApiToggle(apiId: string, enabled: boolean, useTor: boolean = false): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO api_toggles (api_id, enabled, use_tor) VALUES (?, ?, ?)').run(apiId, enabled ? 1 : 0, useTor ? 1 : 0);
}
