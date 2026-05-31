// Pillar mode — a focus filter over the IA. Greyline is one app spanning three
// pillars (travel risk · counter-surveillance · investigation); a user who only
// does one can narrow the sidebar + tools to it. "All" (default) = today's full
// surface. This is a focus aid, not access control — every page still works.

export type Pillar = "travel" | "counter-surveillance" | "journalism";
export type PillarMode = Pillar | "all";

export const PILLARS: { id: PillarMode; label: string }[] = [
  { id: "all", label: "All pillars" },
  { id: "travel", label: "Travel risk" },
  { id: "counter-surveillance", label: "Counter-surveillance" },
  { id: "journalism", label: "Investigation" },
];

export function isPillarMode(v: string | null | undefined): v is PillarMode {
  return v === "all" || v === "travel" || v === "counter-surveillance" || v === "journalism";
}

/** Shown when in "All", when untagged (cross-cutting, e.g. Home/Map/Vault), or
 *  when the item's tags include the active pillar. */
export function visibleInPillar(tags: Pillar[] | undefined, mode: PillarMode): boolean {
  if (mode === "all" || !tags || tags.length === 0) return true;
  return tags.includes(mode);
}
