/**
 * Tiny in-memory rate limiter for local API routes.
 *
 * Greyline is single-user and localhost-only, so this is defence-in-depth, not a
 * network control: it caps how fast a local process can brute-force the vault
 * passphrase or hammer the restore endpoint. Per-key fixed-window counters held
 * in process memory (reset on restart) — adequate for that threat, and the key
 * space is a handful of static route names so the map never grows.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count++;
  return { ok: true };
}

/** Standard 429 response with a Retry-After header. */
export function tooManyRequests(retryAfterSec: number): Response {
  return Response.json(
    { ok: false, error: "Too many requests — slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}
