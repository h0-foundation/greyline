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

// Note: api_key is never returned — only `has_key` (a boolean). The raw key
// stays server-side and is injected by the gateway.
export function getApiToggles(): { api_id: string; enabled: boolean; use_tor: boolean; has_key: boolean }[] {
  const db = getDb();
  const rows = db.prepare('SELECT api_id, enabled, use_tor, api_key FROM api_toggles').all() as { api_id: string; enabled: number; use_tor: number; api_key: string | null }[];
  return rows.map(r => ({ api_id: r.api_id, enabled: r.enabled === 1, use_tor: r.use_tor === 1, has_key: Boolean(r.api_key) }));
}

// ON CONFLICT (not INSERT OR REPLACE) so flipping a toggle preserves any stored key.
export function setApiToggle(apiId: string, enabled: boolean, useTor: boolean = false): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO api_toggles (api_id, enabled, use_tor) VALUES (?, ?, ?)
     ON CONFLICT(api_id) DO UPDATE SET enabled = excluded.enabled, use_tor = excluded.use_tor`,
  ).run(apiId, enabled ? 1 : 0, useTor ? 1 : 0);
}

/** Set (or clear, with null) a connector's API key. Never exposed to the client. */
export function setApiKey(apiId: string, key: string | null): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO api_toggles (api_id, enabled, use_tor, api_key) VALUES (?, 0, 0, ?)
     ON CONFLICT(api_id) DO UPDATE SET api_key = excluded.api_key`,
  ).run(apiId, key);
}

export function getApiKey(apiId: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT api_key FROM api_toggles WHERE api_id = ?').get(apiId) as { api_key: string | null } | undefined;
  return row?.api_key ?? null;
}
