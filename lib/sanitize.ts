/* Pure helpers for the document/image sanitizer. The pixel work (canvas decode,
 * redaction draw, re-encode) lives in the client component; these are the small
 * deterministic bits worth unit-testing. */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Output name for a sanitized copy: drop the original extension, append the
 *  "-sanitized.<ext>" marker so the original is never silently overwritten. */
export function sanitizedFilename(name: string, ext: "png" | "jpg"): string {
  const base = name.replace(/\.[^./\\]+$/, "").trim() || "image";
  return `${base}-sanitized.${ext}`;
}

/** Normalize a drag (two corners, in any order) to a top-left rect with
 *  non-negative width/height — so a box dragged right-to-left or bottom-to-top
 *  still covers the intended area. */
export function normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

/** A rect is meaningful only if it actually covers some pixels. */
export function isDrawableRect(r: Rect, min = 3): boolean {
  return r.w >= min && r.h >= min;
}
