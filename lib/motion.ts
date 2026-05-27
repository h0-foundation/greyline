// Motion tokens — the single source of truth for animation timing.
// Mirrors the CSS `--duration-*` / `--ease-*` tokens in app/globals.css. Framer
// Motion wants seconds + cubic-bezier tuples (not CSS vars), so they live here too.
// Keep the two in sync.

type Bezier = [number, number, number, number];

/** Seconds. Kowalski: ease-out default, exit faster than enter. */
export const DURATION = {
  snap: 0.15,
  default: 0.24,
  enter: 0.28,
  exit: 0.18,
  slow: 0.42,
} as const;

export const EASE = {
  outQuint: [0.16, 1, 0.3, 1] as Bezier,
  outSoft: [0, 0, 0.2, 1] as Bezier,
  inQuick: [0.4, 0, 1, 1] as Bezier,
  spring: [0.34, 1.56, 0.64, 1] as Bezier,
} as const;

/** Ready-made `transition` objects for the common cases. Spread to add `delay`. */
export const TRANSITION = {
  snap: { duration: DURATION.snap, ease: EASE.outQuint },
  default: { duration: DURATION.default, ease: EASE.outQuint },
  enter: { duration: DURATION.enter, ease: EASE.outQuint },
  exit: { duration: DURATION.exit, ease: EASE.inQuick },
  slow: { duration: DURATION.slow, ease: EASE.outQuint },
} as const;
