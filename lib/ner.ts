/* Local entity extraction — pure, offline, dependency-free.
 *
 * A pragmatic, rule-based extractor (NOT a statistical NER model): regexes for
 * the structured identifiers an investigator actually pivots on — emails, phones,
 * URLs, IPs, IBANs, crypto addresses, @handles — plus a capitalized-sequence
 * heuristic for person/org candidates. Runs entirely on-device over pasted text
 * or case notes and feeds the self-doxxing query generator. Honest about its
 * limits: the "name" type is a heuristic guess, everything else is exact.
 */

export type EntityType = "email" | "phone" | "url" | "ipv4" | "iban" | "crypto" | "handle" | "name";

export interface Entity {
  type: EntityType;
  value: string;
  count: number;
}

export const ENTITY_LABEL: Record<EntityType, string> = {
  email: "Emails",
  phone: "Phone numbers",
  url: "URLs",
  ipv4: "IP addresses",
  iban: "IBANs",
  crypto: "Crypto addresses",
  handle: "Handles",
  name: "Names / orgs (candidates)",
};

// First words that signal a sentence start rather than a real name/org.
const NAME_STOPWORDS = new Set([
  "The", "A", "An", "This", "That", "These", "Those", "On", "At", "In", "For", "But", "And",
  "He", "She", "They", "We", "It", "His", "Her", "Their", "My", "Our", "If", "When", "While",
]);

interface PatternDef {
  type: EntityType;
  re: RegExp;
  ci: boolean; // case-insensitive dedup key
}

// Order matters: structured tokens are harvested (and blanked out) first so a
// phone/handle/name pass can't re-match digits or @ inside an email or URL.
const PATTERNS: PatternDef[] = [
  { type: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, ci: true },
  { type: "url", re: /\bhttps?:\/\/[^\s<>"')]+/gi, ci: true },
  { type: "ipv4", re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g, ci: false },
  { type: "iban", re: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g, ci: false },
  { type: "crypto", re: /\b(?:bc1[ac-hj-np-z02-9]{11,71}|0x[a-fA-F0-9]{40})\b/g, ci: false },
  { type: "handle", re: /(?<![\w@])@[A-Za-z0-9_]{2,30}\b/g, ci: true },
  { type: "phone", re: /(?<![\w.])\+?\d[\d\s().-]{7,16}\d(?![\w])/g, ci: false },
];

function harvest(text: string, def: PatternDef, out: Entity[]): string {
  const counts = new Map<string, Entity>();
  const blanked = text.replace(def.re, (m) => {
    const key = def.ci ? m.toLowerCase() : m;
    const existing = counts.get(key);
    if (existing) existing.count++;
    else counts.set(key, { type: def.type, value: m.trim(), count: 1 });
    return " ".repeat(m.length);
  });
  for (const e of counts.values()) out.push(e);
  return blanked;
}

function harvestNames(text: string, out: Entity[]): void {
  // Continuation words allow internal apostrophes/hyphens but NOT a period — a
  // period would let a word absorb the sentence terminator and bridge into the
  // next sentence ("Acme Corporation. The Building").
  const re = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,3})\b/g;
  const counts = new Map<string, Entity>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const value = m[1].trim();
    const first = value.split(/\s+/)[0];
    if (NAME_STOPWORDS.has(first)) continue;
    const existing = counts.get(value);
    if (existing) existing.count++;
    else counts.set(value, { type: "name", value, count: 1 });
  }
  for (const e of counts.values()) out.push(e);
}

/** Extract entities from free text. Returns one row per distinct value with an
 *  occurrence count, sorted by type order then descending count. */
export function extractEntities(text: string): Entity[] {
  const out: Entity[] = [];
  if (!text || !text.trim()) return out;
  let working = text;
  for (const def of PATTERNS) working = harvest(working, def, out);
  harvestNames(working, out);

  const order: EntityType[] = ["name", "email", "phone", "handle", "url", "ipv4", "iban", "crypto"];
  return out.sort((a, b) => {
    const t = order.indexOf(a.type) - order.indexOf(b.type);
    return t !== 0 ? t : b.count - a.count;
  });
}

/** Group extracted entities by type, preserving the canonical type order. */
export function groupEntities(entities: Entity[]): Array<{ type: EntityType; label: string; items: Entity[] }> {
  const order: EntityType[] = ["name", "email", "phone", "handle", "url", "ipv4", "iban", "crypto"];
  return order
    .map((type) => ({ type, label: ENTITY_LABEL[type], items: entities.filter((e) => e.type === type) }))
    .filter((g) => g.items.length > 0);
}
