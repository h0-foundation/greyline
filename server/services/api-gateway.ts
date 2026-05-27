import { getDb } from '../db/index';
import { ofetch } from 'ofetch';

interface ProxyOptions {
  apiId: string;
  url: string;
  params?: Record<string, string>;
  cacheTtlSeconds?: number;
}

interface ApiToggle {
  api_id: string;
  enabled: number;
  use_tor: number;
}

export function isApiEnabled(apiId: string): boolean {
  const db = getDb();
  const masterOffline = db.prepare("SELECT value FROM settings WHERE key = 'master_offline'").get() as { value: string } | undefined;
  if (masterOffline?.value === 'true') return false;

  const toggle = db.prepare('SELECT enabled FROM api_toggles WHERE api_id = ?').get(apiId) as ApiToggle | undefined;
  return toggle?.enabled === 1;
}

export function getApiToggle(apiId: string): ApiToggle | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM api_toggles WHERE api_id = ?').get(apiId) as ApiToggle | undefined;
}

export function setApiToggle(apiId: string, enabled: boolean, useTor: boolean = false): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO api_toggles (api_id, enabled, use_tor) VALUES (?, ?, ?)').run(apiId, enabled ? 1 : 0, useTor ? 1 : 0);
}

export async function proxyFetch<T = unknown>(options: ProxyOptions): Promise<{ data: T; cached: boolean } | null> {
  const { apiId, url, params, cacheTtlSeconds = 3600 } = options;

  if (!isApiEnabled(apiId)) return null;

  const db = getDb();
  const cacheKey = `${apiId}:${url}:${JSON.stringify(params || {})}`;

  // Check cache
  const cached = db.prepare(
    "SELECT data FROM api_cache WHERE cache_key = ? AND (expires_at IS NULL OR expires_at > datetime('now'))"
  ).get(cacheKey) as { data: string } | undefined;

  if (cached) {
    return { data: JSON.parse(cached.data), cached: true };
  }

  // Fetch with stripped headers
  const data = await ofetch<T>(url, {
    params,
    headers: {
      'User-Agent': '',
      'Referer': '',
      'Accept': 'application/json'
    },
    timeout: 10000
  });

  // Cache result
  const expiresAt = new Date(Date.now() + cacheTtlSeconds * 1000).toISOString();
  db.prepare(
    'INSERT OR REPLACE INTO api_cache (cache_key, api_id, data, cached_at, expires_at) VALUES (?, ?, ?, datetime(\'now\'), ?)'
  ).run(cacheKey, apiId, JSON.stringify(data), expiresAt);

  return { data, cached: false };
}

export function clearCache(apiId?: string): void {
  const db = getDb();
  if (apiId) {
    db.prepare('DELETE FROM api_cache WHERE api_id = ?').run(apiId);
  } else {
    db.prepare('DELETE FROM api_cache').run();
  }
}
