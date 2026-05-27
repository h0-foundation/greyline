// Border device-prep decision engine — pure, deterministic functions.
//
// Given a destination's curated intel posture, the traveler's legal status, and
// a chosen threat level, compute a Border Exposure Score (0–100), a risk band,
// and a personalized, phase-grouped action plan. Each action states WHY it is
// recommended. Nothing here is legal advice — device-search powers vary widely
// by country and by your status (citizen / resident / visa holder / none).
//
// References: EFF "Digital Privacy at the U.S. Border".

/** Subset of GET /api/intel `intel` we actually score on (all may be null). */
export interface BorderIntel {
  decryption_compulsion: string | null; // 'none' | 'possible' | 'yes'
  sim_registration: string | null; // e.g. 'required' | 'biometric' | 'none'
  advisory_level: number | null; // 1–4
}

/** Traveler's legal relationship to the destination — drives coercion risk. */
export type TravelerStatus =
  | "citizen"
  | "perm_resident"
  | "visa_holder"
  | "vwp_eta"
  | "none";

/** How adversarial the user expects this crossing to be. */
export type ThreatLevel = "routine" | "elevated" | "high" | "extreme";

export type Phase = "before" | "at" | "after";

export interface BorderAction {
  phase: Phase;
  text: string;
  reason: string;
}

export interface BorderPlan {
  score: number;
  band: "Low" | "Elevated" | "High";
  actions: BorderAction[];
}

/** Accounts a user may want to sign out of before a crossing — UI checklist only. */
export const ACCOUNT_CATEGORIES = [
  "Email",
  "Cloud storage",
  "Password manager",
  "Messaging",
  "Social media",
  "Banking",
  "Employer SSO",
  "Work CMS",
] as const;

// --- Scoring tables ----------------------------------------------------------

const COMPEL_LAW: Record<string, number> = { none: 0, possible: 25, yes: 45 };
const STATUS_MULT: Record<TravelerStatus, number> = {
  citizen: 0.5,
  perm_resident: 0.8,
  visa_holder: 1.0,
  vwp_eta: 1.0,
  none: 1.0,
};
const THREAT_BASE: Record<ThreatLevel, number> = {
  routine: 5,
  elevated: 20,
  high: 35,
  extreme: 50,
};

const clamp = (lo: number, hi: number, n: number) => Math.max(lo, Math.min(hi, n));

export interface BorderInput {
  intel: BorderIntel;
  status: TravelerStatus;
  threatLevel: ThreatLevel;
}

/**
 * Compute the exposure score and the personalized phase-grouped action plan.
 * Deterministic: same input → same output.
 */
export function borderPlan({ intel, status, threatLevel }: BorderInput): BorderPlan {
  const compelKey = intel.decryption_compulsion ?? "none";
  const compelLaw = COMPEL_LAW[compelKey] ?? 0; // default 0 if null/unknown
  const statusMult = STATUS_MULT[status];
  const threatBase = THREAT_BASE[threatLevel];
  const surveil = (intel.advisory_level ?? 0) >= 3 ? 10 : 0;
  const sim = intel.sim_registration;
  const simRisk = sim === "biometric" ? 8 : sim === "required" ? 4 : 0;

  const score = clamp(0, 100, Math.round(compelLaw * statusMult + threatBase + surveil + simRisk));
  const band: BorderPlan["band"] = score < 25 ? "Low" : score < 55 ? "Elevated" : "High";

  const actions: BorderAction[] = [];

  // Baseline — always.
  actions.push({
    phase: "before",
    text: "Enable full-disk encryption on every device; verify it's actually on.",
    reason: "baseline",
  });

  // Power off vs. lock at the line.
  if (compelLaw >= 25 || threatBase >= 35) {
    actions.push({
      phase: "at",
      text: "Power devices fully OFF before the line.",
      reason: "defeats biometric/RAM-key attacks; forces a password",
    });
  }
  if (compelLaw < 25 && threatBase < 35) {
    actions.push({
      phase: "at",
      text: "Locking (not powering off) is acceptable here.",
      reason: "low compelled-disclosure risk",
    });
  }

  // Compelled decryption + non-citizen → carry a clean device.
  if (
    compelKey === "yes" &&
    (status === "visa_holder" || status === "vwp_eta" || status === "none")
  ) {
    actions.push({
      phase: "before",
      text: "Carry a clean/burner device; leave your primary at home or encrypted off-device.",
      reason: "compelled decryption + non-citizen = high coercion",
    });
  }

  // High score → strip sensitive sessions.
  if (score >= 55) {
    actions.push({
      phase: "before",
      text: "Sign out of and remove session tokens for sensitive accounts (see list).",
      reason: "limits what a device search exposes",
    });
  }

  // Non-citizens → decide refusal posture in advance.
  if (status !== "citizen") {
    actions.push({
      phase: "at",
      text: "Decide your refusal posture in advance — refusal may mean denied entry or device seizure.",
      reason: "non-citizens face higher coercion",
    });
  }

  // SIM registration regime.
  if (sim && sim !== "none") {
    actions.push({
      phase: "before",
      text: "Expect SIM/biometric registration; consider a data-only eSIM.",
      reason: "SIM registration regime",
    });
  }

  // Password-manager travel mode — always.
  actions.push({
    phase: "before",
    text: "Travel-mode your password manager; disable biometric unlock so only a memorized passphrase opens it.",
    reason: "biometrics can be compelled more easily than a passphrase",
  });

  // After — always.
  actions.push({
    phase: "after",
    text: "If any device left your sight, treat it as compromised — rotate credentials afterward.",
    reason: "out-of-sight devices can be imaged or tampered with",
  });

  return { score, band, actions };
}
