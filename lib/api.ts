/**
 * Shared API-route response helpers. The single rule: a raw exception string
 * (which can carry SQL fragments, file paths, or upstream URLs) must never reach
 * the client. Handlers log the real error server-side and return a generic,
 * caller-chosen message. Mirrors the shape PR #45 set in the destinations route.
 */

/** Success envelope: { ok: true, ...data }. */
export function jsonOk(data: Record<string, unknown> = {}, init?: ResponseInit): Response {
  return Response.json({ ok: true, ...data }, init);
}

/** Error envelope with a generic, client-safe message (never a raw exception). */
export function jsonError(message: string, status = 500): Response {
  return Response.json({ ok: false, error: message }, { status });
}

/**
 * Log the real error server-side under `scope`, return the generic envelope.
 * Use in catch blocks: `return fail("POST /api/trips", err, "Could not save the trip.");`
 */
export function fail(scope: string, err: unknown, message: string, status = 500): Response {
  console.error(`${scope} failed:`, err);
  return jsonError(message, status);
}
