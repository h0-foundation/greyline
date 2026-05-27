/** Phased digital-hygiene + tradecraft checklist templates, grounded in EFF SSD,
 *  Freedom of the Press Foundation, CPJ, and GIJN guidance. Used to generate
 *  destination-aware OPSEC checklists. Higher threat levels surface more items. */
import type { ThreatLevel } from "@/lib/intel";

export type OpsecItem = { id: string; label: string; checked: boolean; notes?: string; minLevel?: ThreatLevel };
export type OpsecPhase = { type: string; name: string; items: Omit<OpsecItem, "checked">[] };

const LEVEL_RANK: Record<ThreatLevel, number> = { routine: 0, elevated: 1, high: 2, extreme: 3 };

export const OPSEC_TEMPLATES: OpsecPhase[] = [
  {
    type: "pre-trip",
    name: "Pre-trip digital hygiene",
    items: [
      { id: "pre-fde", label: "Enable full-disk encryption (FileVault / BitLocker / LUKS)" },
      { id: "pre-updates", label: "Update OS and apps; reboot" },
      { id: "pre-mfa", label: "Switch SMS 2FA to a hardware key or authenticator app", minLevel: "elevated" },
      { id: "pre-pwmgr", label: "Password-manager audit; rotate reused/weak passwords" },
      { id: "pre-travel-accounts", label: "Create travel-only email/accounts; sign out of others", minLevel: "elevated" },
      { id: "pre-vpn", label: "Install and test a reputable VPN before departure" },
      { id: "pre-backup", label: "Full device backup stored at home (not carried)" },
      { id: "pre-minimize", label: "Minimize data carried; move sensitive files to encrypted backup and remove locally", minLevel: "high" },
      { id: "pre-burner", label: "Decide on a clean/burner device for high-risk borders", minLevel: "high" },
      { id: "pre-contacts", label: "Brief a trusted contact with itinerary + check-in cadence" },
      { id: "pre-duress", label: "Agree a duress signal / safe-word with your contact", minLevel: "high" },
      { id: "pre-doxx", label: "Run a self-doxxing audit; lock down social privacy", minLevel: "elevated" },
    ],
  },
  {
    type: "border-crossing",
    name: "At the border",
    items: [
      { id: "bd-off", label: "Power devices fully OFF before the line (defeats memory extraction)" },
      { id: "bd-fde", label: "Confirm full-disk encryption is on" },
      { id: "bd-know-rights", label: "Know your rights by status (citizen vs visitor) for this country" },
      { id: "bd-social", label: "Review/clean social handles you may be asked for", minLevel: "elevated" },
      { id: "bd-cloud", label: "Sensitive data in encrypted cloud, removed from device; retrieve after crossing", minLevel: "high" },
      { id: "bd-compelled", label: "Understand local decryption-compulsion law before deciding to refuse", minLevel: "high" },
    ],
  },
  {
    type: "during",
    name: "On the ground",
    items: [
      { id: "dur-wifi", label: "Treat public Wi-Fi as hostile; VPN on" },
      { id: "dur-charge", label: "Use a USB data-blocker on public charging" },
      { id: "dur-social", label: "Social-media blackout / delay posts (no real-time location)", minLevel: "elevated" },
      { id: "dur-checkin", label: "Keep agreed check-in cadence with your contact" },
      { id: "dur-grayman", label: "Blend in: neutral dress, no logos, low profile", minLevel: "elevated" },
      { id: "dur-sdr", label: "Run a surveillance-detection route before sensitive meetings", minLevel: "high" },
      { id: "dur-faraday", label: "Faraday bag for phone when going dark", minLevel: "extreme" },
    ],
  },
  {
    type: "post-trip",
    name: "Post-trip",
    items: [
      { id: "post-rotate", label: "Rotate credentials used while traveling" },
      { id: "post-sessions", label: "Review active login sessions; revoke unknown ones" },
      { id: "post-reimage", label: "Re-image / factory-reset any burner device", minLevel: "high" },
      { id: "post-breach", label: "Check accounts against Have I Been Pwned" },
      { id: "post-debrief", label: "Debrief incidents into the incident log", minLevel: "elevated" },
    ],
  },
];

/** Build checklist items for a phase, filtered to the trip's threat level. */
export function itemsForLevel(phase: OpsecPhase, level: ThreatLevel): OpsecItem[] {
  return phase.items
    .filter((it) => !it.minLevel || LEVEL_RANK[it.minLevel] <= LEVEL_RANK[level])
    .map((it) => ({ ...it, checked: false }));
}
