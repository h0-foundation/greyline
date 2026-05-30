/**
 * Small hand-rolled request validation. The repo deliberately avoids Zod, so this
 * is just safe JSON parsing plus a few field predicates, returning typed results
 * a route handler can branch on to emit a clean 400 instead of throwing on
 * malformed input. Adopt incrementally across the mutation routes.
 */
export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Parse a JSON request body, requiring an object. Never throws. */
export async function parseJsonObject<T = Record<string, unknown>>(
  req: Request,
): Promise<ParseResult<T>> {
  let value: unknown;
  try {
    value = await req.json();
  } catch {
    return { ok: false, error: "Malformed JSON body" };
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Expected a JSON object body" };
  }
  return { ok: true, value: value as T };
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** A `YYYY-MM-DD` calendar date (the shape an <input type="date"> emits). */
export function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function badRequest(error: string): Response {
  return Response.json({ ok: false, error }, { status: 400 });
}
