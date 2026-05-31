import { getDb } from '../db/index';
import { ofetch } from 'ofetch';

interface ProxyOptions {
  apiId: string;
  url: string;
  params?: Record<string, string>;
  cacheTtlSeconds?: number;
  // For key-required connectors: where to inject the stored api_key. If set and
  // no key is stored, the request is refused (the connector stays gated).
  //  - header/query: `name` is the header/param name.
  //  - path: `name` is a placeholder substring in `url` (e.g. "{KEY}") replaced
  //    with the key at fetch time — kept out of the cache key so it never lands
  //    in api_cache (some APIs, e.g. FIRMS, carry the key as a URL path segment).
  auth?: { in: "header" | "query" | "path"; name: string };
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
  // ON CONFLICT (not REPLACE) so flipping a toggle never wipes a stored api_key.
  db.prepare(
    `INSERT INTO api_toggles (api_id, enabled, use_tor) VALUES (?, ?, ?)
     ON CONFLICT(api_id) DO UPDATE SET enabled = excluded.enabled, use_tor = excluded.use_tor`,
  ).run(apiId, enabled ? 1 : 0, useTor ? 1 : 0);
}

export async function proxyFetch<T = unknown>(options: ProxyOptions): Promise<{ data: T; cached: boolean } | null> {
  const { apiId, url, params, cacheTtlSeconds = 3600 } = options;

  if (!isApiEnabled(apiId)) return null;

  // use_tor honesty: anonymized (Tor SOCKS) routing is not yet wired. If a
  // connector is flagged for Tor, FAIL CLOSED rather than send the request
  // directly from the user's real IP — which would silently break the
  // anonymization the flag implies. (Roadmap: wire a SOCKS dispatcher; see #42.)
  const toggle = getApiToggle(apiId);
  if (toggle?.use_tor) {
    console.warn(`proxyFetch: "${apiId}" has use_tor set but Tor routing is not implemented — refusing a direct (de-anonymizing) request.`);
    return null;
  }

  const db = getDb();

  // Key-required connectors: a key must be present, else gate (treat as off).
  let apiKey: string | null = null;
  if (options.auth) {
    const row = db.prepare('SELECT api_key FROM api_toggles WHERE api_id = ?').get(apiId) as { api_key: string | null } | undefined;
    apiKey = row?.api_key ?? null;
    if (!apiKey) {
      console.warn(`proxyFetch: "${apiId}" requires an API key but none is set — refusing.`);
      return null;
    }
  }

  const cacheKey = `${apiId}:${url}:${JSON.stringify(params || {})}`;

  // Check cache
  const cached = db.prepare(
    "SELECT data FROM api_cache WHERE cache_key = ? AND (expires_at IS NULL OR expires_at > datetime('now'))"
  ).get(cacheKey) as { data: string } | undefined;

  if (cached) {
    return { data: JSON.parse(cached.data), cached: true };
  }

  // Identify the app (required by OSM Nominatim/Overpass usage policy; an empty
  // UA gets a 403). It names the software, never the user — privacy intact.
  const headers: Record<string, string> = {
    'User-Agent': 'Greyline/1.0 (privacy-first local travel app; self-hosted)',
    'Accept': 'application/json',
  };
  const finalParams: Record<string, string> = { ...(params || {}) };
  let finalUrl = url;
  if (options.auth && apiKey) {
    if (options.auth.in === 'header') headers[options.auth.name] = apiKey;
    else if (options.auth.in === 'path') finalUrl = url.split(options.auth.name).join(apiKey);
    else finalParams[options.auth.name] = apiKey;
  }

  const data = await ofetch<T>(finalUrl, {
    params: finalParams,
    headers,
    timeout: 10000,
    // Don't follow cross-host 3xx redirects: a compromised/MITM'd upstream could
    // redirect to an internal/link-local target (SSRF), undermining egress control.
    redirect: 'error'
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
