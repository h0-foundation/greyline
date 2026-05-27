/** Client-safe formatting for the curated privacy-posture layer: maps raw enum
 *  values to plain-language labels + a semantic tone for calm, accessible color. */

export type Tone = "good" | "caution" | "warn" | "danger" | "neutral";

export const TONE_CLASS: Record<Tone, string> = {
  good: "text-success",
  caution: "text-warning",
  warn: "text-warning",
  danger: "text-destructive",
  neutral: "text-muted-foreground",
};

export const TONE_DOT: Record<Tone, string> = {
  good: "bg-success",
  caution: "bg-warning",
  warn: "bg-warning",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground",
};

function map<T extends string>(
  value: string | null,
  table: Record<string, { label: string; tone: Tone }>,
): { label: string; tone: Tone } {
  if (!value) return { label: "Unknown", tone: "neutral" };
  return table[value] ?? { label: value, tone: "neutral" };
}

export const vpn = (v: string | null) =>
  map(v, {
    legal: { label: "Legal", tone: "good" },
    restricted: { label: "Restricted", tone: "warn" },
    illegal: { label: "Illegal", tone: "danger" },
  });

export const decryption = (v: string | null) =>
  map(v, {
    none: { label: "No compulsion", tone: "good" },
    possible: { label: "Possible", tone: "caution" },
    yes: { label: "Can be compelled", tone: "danger" },
  });

export const sim = (v: string | null) =>
  map(v, {
    none: { label: "No registration", tone: "good" },
    required: { label: "Registration required", tone: "caution" },
    biometric: { label: "Biometric registration", tone: "danger" },
  });

export const lgbtq = (v: string | null) =>
  map(v, {
    low: { label: "Low risk", tone: "good" },
    moderate: { label: "Moderate risk", tone: "caution" },
    high: { label: "High risk", tone: "warn" },
    severe: { label: "Severe risk", tone: "danger" },
  });

export const freedomStatus = (v: string | null) =>
  map(v, {
    Free: { label: "Free", tone: "good" },
    "Partly Free": { label: "Partly Free", tone: "caution" },
    "Not Free": { label: "Not Free", tone: "danger" },
  });

/** US-style advisory level 1-4 → label + tone. */
export function advisory(level: number | null): { label: string; tone: Tone } {
  switch (level) {
    case 1: return { label: "Level 1 · Normal precautions", tone: "good" };
    case 2: return { label: "Level 2 · Increased caution", tone: "caution" };
    case 3: return { label: "Level 3 · Reconsider travel", tone: "warn" };
    case 4: return { label: "Level 4 · Do not travel", tone: "danger" };
    default: return { label: "No advisory on record", tone: "neutral" };
  }
}

export type ThreatLevel = "routine" | "elevated" | "high" | "extreme";

export const THREAT: Record<ThreatLevel, { label: string; tone: Tone; index: number }> = {
  routine: { label: "Routine", tone: "good", index: 0 },
  elevated: { label: "Elevated", tone: "caution", index: 1 },
  high: { label: "High", tone: "warn", index: 2 },
  extreme: { label: "Extreme", tone: "danger", index: 3 },
};

/** Suggest a threat level from curated intel: advisory level + freedom + surveillance posture. */
export function suggestThreatLevel(intel: {
  advisory_level: number | null;
  freedom_status: string | null;
  vpn_legality: string | null;
  decryption_compulsion: string | null;
} | null | undefined): ThreatLevel {
  if (!intel) return "routine";
  let score = 0;
  score += (intel.advisory_level ?? 1) - 1; // 0..3
  if (intel.freedom_status === "Partly Free") score += 1;
  if (intel.freedom_status === "Not Free") score += 2;
  if (intel.vpn_legality === "restricted") score += 1;
  if (intel.vpn_legality === "illegal") score += 2;
  if (intel.decryption_compulsion === "yes") score += 1;
  if (score >= 5) return "extreme";
  if (score >= 3) return "high";
  if (score >= 1) return "elevated";
  return "routine";
}

export const VISA_LABEL: Record<string, { label: string; tone: Tone }> = {
  visa_free: { label: "Visa-free", tone: "good" },
  visa_on_arrival: { label: "Visa on arrival", tone: "caution" },
  e_visa: { label: "e-Visa", tone: "caution" },
  eta: { label: "ETA required", tone: "caution" },
  visa_required: { label: "Visa required", tone: "warn" },
  no_admission: { label: "No admission", tone: "danger" },
  home: { label: "Home country", tone: "neutral" },
};
