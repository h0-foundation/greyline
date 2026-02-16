import { getDb } from '../index.js';

export function getCached(cacheKey: string) {
  return getDb().prepare(
    "SELECT data FROM api_cache WHERE cache_key = ? AND (expires_at IS NULL OR expires_at > datetime('now'))"
  ).get(cacheKey) as { data: string } | undefined;
}

export function setCache(cacheKey: string, apiId: string, data: string, ttlSeconds: number = 3600) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  getDb().prepare(
    "INSERT OR REPLACE INTO api_cache (cache_key, api_id, data, cached_at, expires_at) VALUES (?, ?, ?, datetime('now'), ?)"
  ).run(cacheKey, apiId, data, expiresAt);
}

export function clearCacheByApi(apiId: string) {
  getDb().prepare('DELETE FROM api_cache WHERE api_id = ?').run(apiId);
}

export function clearExpiredCache() {
  getDb().prepare("DELETE FROM api_cache WHERE expires_at < datetime('now')").run();
}
