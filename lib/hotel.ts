// Hotel room-security scoring.
//
// Encodes OSAC / executive-protection room-selection tradecraft as a set of
// independent penalty factors. We start every room at a perfect 100 and
// subtract a penalty for each weakness present. The result is a 0-100 score
// plus a letter grade and a ranked list of the gaps that hurt the most.
//
// All functions here are pure (no I/O, no DOM) so they can be unit-tested and
// reused on the server or client.

/** The answer for a single boolean factor, or undefined if not yet answered. */
export type Answers = {
  /** Room floor number. 0 / undefined treated as ground floor. */
  floor: number;
  secondaryLock: boolean; // swing bar / chain present?
  deadbolt: boolean; // deadbolt works?
  viewer: boolean; // clear one-way peephole?
  windowAccess: boolean; // window reachable from outside?
  windowLock: boolean; // all windows/balcony latch?
  nearStairwell: boolean; // adjacent to stairwell/elevator/service?
  corridorEnd: boolean; // dead end of corridor?
  exteriorEntry: boolean; // door opens to exterior walkway (motel-style)?
  twoExits: boolean; // two independent exits on the floor?
  safe: boolean; // in-room safe present?
  curtainGap: boolean; // curtains fully close (no gap)?
};

export type FactorType = "floor" | "boolean";

export type Factor = {
  id: keyof Answers;
  /** Question shown to the user. */
  question: string;
  type: FactorType;
  /**
   * For boolean factors: `true` means "this is the desired/secure answer".
   * Penalty is applied when the answer is NOT the desired state.
   * For the floor factor this is ignored (penalty is piecewise on the number).
   */
  desired?: boolean;
  /** Whether this factor is amplified by the high-crime multiplier. */
  highCrimeAmplified?: boolean;
  /** Raw penalty for this factor given the full answer set (before multiplier). */
  penalty: (a: Answers) => number;
  /** One-line corrective action surfaced when the factor is a gap. */
  fix: string;
};

/** Ground floor is worst; floors 3-6 are ideal; very high risks egress/ladder reach. */
function floorPenalty(f: number): number {
  if (f <= 1) return 22; // ground floor: smash/grab + easy access
  if (f === 2) return 8; // low but climbable
  if (f >= 3 && f <= 6) return 0; // sweet spot: above reach, below ladder limit
  if (f <= 8) return 6; // getting high for fire-ladder reach
  return 12; // very high: slow egress, beyond most ladders
}

/**
 * The ordered factor list. The penalty fn returns the un-amplified penalty;
 * `scoreRoom` applies the high-crime multiplier to amplified factors.
 */
export const FACTORS: Factor[] = [
  {
    id: "floor",
    question: "What floor is the room on?",
    type: "floor",
    highCrimeAmplified: true,
    penalty: (a) => floorPenalty(a.floor),
    fix: "Request a room on floors 3–6 — above easy reach, below fire-ladder limits.",
  },
  {
    id: "secondaryLock",
    question: "Is there a working secondary lock (swing bar or chain)?",
    type: "boolean",
    desired: true,
    penalty: (a) => (a.secondaryLock ? 0 : 15),
    fix: "Get a room with a swing bar or chain, or carry a portable door lock.",
  },
  {
    id: "deadbolt",
    question: "Does the deadbolt work?",
    type: "boolean",
    desired: true,
    penalty: (a) => (a.deadbolt ? 0 : 14),
    fix: "Insist on a working deadbolt, or use a door wedge as a backup.",
  },
  {
    id: "viewer",
    question: "Is the peephole clear and one-way?",
    type: "boolean",
    desired: true,
    penalty: (a) => (a.viewer ? 0 : 8),
    fix: "Confirm a clear peephole; if covered or damaged, request a change and verify visitors by phone.",
  },
  {
    id: "windowAccess",
    question: "Are windows/balcony reachable from outside?",
    type: "boolean",
    desired: false,
    highCrimeAmplified: true,
    penalty: (a) => (a.windowAccess ? 12 : 0),
    fix: "Avoid rooms whose windows or balcony can be reached from a ledge, roof, or adjacent structure.",
  },
  {
    id: "windowLock",
    question: "Do all windows and balcony doors latch?",
    type: "boolean",
    desired: true,
    penalty: (a) => (a.windowLock ? 0 : 9),
    fix: "Request a room where every window and balcony door locks fully.",
  },
  {
    id: "nearStairwell",
    question: "Is the room next to a stairwell, elevator, or service area?",
    type: "boolean",
    desired: false,
    penalty: (a) => (a.nearStairwell ? 7 : 0),
    fix: "Pick a room away from stairwells, elevators, and service areas to cut foot traffic and easy approach.",
  },
  {
    id: "corridorEnd",
    question: "Is the room at a dead end of the corridor?",
    type: "boolean",
    desired: false,
    penalty: (a) => (a.corridorEnd ? 5 : 0),
    fix: "Avoid dead-end rooms; choose a mid-corridor room with two ways to move.",
  },
  {
    id: "exteriorEntry",
    question: "Does the door open onto an exterior walkway (motel-style)?",
    type: "boolean",
    desired: false,
    highCrimeAmplified: true,
    penalty: (a) => (a.exteriorEntry ? 9 : 0),
    fix: "Prefer interior-corridor rooms; exterior-walkway doors are exposed to direct street approach.",
  },
  {
    id: "twoExits",
    question: "Are there two independent exits on your floor?",
    type: "boolean",
    desired: true,
    penalty: (a) => (a.twoExits ? 0 : 8),
    fix: "Locate at least two exits before settling in; count doors to the nearest one.",
  },
  {
    id: "safe",
    question: "Is there an in-room safe?",
    type: "boolean",
    desired: true,
    // Deterrence only — kept intentionally low; safes are not real security.
    penalty: (a) => (a.safe ? 0 : 4),
    fix: "Use the safe only for low-value items; keep passport and primary cash on your person.",
  },
  {
    id: "curtainGap",
    question: "Do the curtains fully close (no gap)?",
    type: "boolean",
    desired: true,
    penalty: (a) => (a.curtainGap ? 0 : 3),
    fix: "Choose a room whose curtains close fully so the interior isn't visible at night.",
  },
];

export type Grade = "A" | "B" | "C" | "D" | "F";

export type Gap = {
  label: string;
  penalty: number;
  fix: string;
};

export type RoomScore = {
  score: number;
  grade: Grade;
  gaps: Gap[];
};

/** Default answers: optimistic (no penalties) except floor, which is unknown (ground). */
export const DEFAULT_ANSWERS: Answers = {
  floor: 4,
  secondaryLock: true,
  deadbolt: true,
  viewer: true,
  windowAccess: false,
  windowLock: true,
  nearStairwell: false,
  corridorEnd: false,
  exteriorEntry: false,
  twoExits: true,
  safe: true,
  curtainGap: true,
};

const HIGH_CRIME_MULTIPLIER = 1.3;

function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v));
}

function gradeFor(score: number): Grade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

/**
 * Score a room. Sums each factor's penalty (amplified ×1.3 for the floor,
 * window-access, and exterior-entry factors when `highCrime` is set), then
 * subtracts from 100. Gaps are the factors that contributed any penalty,
 * sorted by impact descending.
 */
export function scoreRoom(answers: Answers, highCrime = false): RoomScore {
  let total = 0;
  const gaps: Gap[] = [];

  for (const factor of FACTORS) {
    let penalty = factor.penalty(answers);
    if (highCrime && factor.highCrimeAmplified) {
      penalty = Math.round(penalty * HIGH_CRIME_MULTIPLIER);
    }
    if (penalty > 0) {
      gaps.push({ label: factor.question, penalty, fix: factor.fix });
    }
    total += penalty;
  }

  gaps.sort((a, b) => b.penalty - a.penalty);
  const score = clamp(0, 100, 100 - total);
  return { score, grade: gradeFor(score), gaps };
}

/**
 * Assemble a single plain-English front-desk request from the active gaps.
 * Maps each gap (by its fix factor) to a short request fragment.
 */
export function frontDeskRequest(gaps: Gap[], floor: number): string {
  if (gaps.length === 0) {
    return "No changes needed — this room meets the security checklist.";
  }

  const ids = new Set(
    gaps.map((g) => FACTORS.find((f) => f.question === g.label)?.id),
  );
  const parts: string[] = [];

  if (ids.has("floor") && (floor <= 2 || floor >= 7)) {
    parts.push("on floors 3 to 6");
  }
  if (ids.has("nearStairwell")) parts.push("not next to a stairwell or elevator");
  if (ids.has("corridorEnd")) parts.push("not at the end of a corridor");
  if (ids.has("exteriorEntry")) parts.push("with an interior-corridor door");
  if (ids.has("windowAccess")) {
    parts.push("with windows that can't be reached from outside");
  }

  // Working hardware the room should have.
  const hardware: string[] = [];
  if (ids.has("secondaryLock")) hardware.push("a secondary lock");
  if (ids.has("deadbolt")) hardware.push("a working deadbolt");
  if (ids.has("windowLock")) hardware.push("windows that latch");
  if (ids.has("viewer")) hardware.push("a clear peephole");
  if (hardware.length > 0) {
    parts.push(`with ${joinList(hardware)}`);
  }

  if (parts.length === 0) {
    return "Could I move to a room that better fits a few security needs? Thank you.";
  }

  return `Could I please move to a room ${joinList(parts)}? Thank you.`;
}

/** Join a list as "a, b, and c". */
function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
