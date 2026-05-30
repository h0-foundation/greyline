/* Personal threat-model wizard — pure, deterministic, offline.
 *
 * Given the user's device OS and a chosen threat tier, returns the digital-
 * signature vectors that apply and the prioritized, EVIDENCE-CITED mitigations
 * for each. Grounded in research/GRAY_MAN_TRADECRAFT.md (Endsley-framed, GAO-
 * corrected): only real, documented threats with real, current mitigations —
 * e.g. "turn radios OFF" (MAC randomization is defeated by probe-request
 * fingerprinting) rather than folklore. Defensive use only. Not legal advice. */

export type DeviceOs = "android" | "ios" | "other";
export type ThreatTier = "routine" | "elevated" | "high" | "extreme";

export const THREAT_TIERS: { value: ThreatTier; label: string }[] = [
  { value: "routine", label: "Routine" },
  { value: "elevated", label: "Elevated" },
  { value: "high", label: "High" },
  { value: "extreme", label: "Extreme" },
];

const TIER_RANK: Record<ThreatTier, number> = { routine: 0, elevated: 1, high: 2, extreme: 3 };

type OsScope = DeviceOs | "all";

export type Mitigation = { text: string; why: string; source: string; os: OsScope };

export type ThreatVector = {
  id: string;
  name: string;
  summary: string;
  /** vector surfaces at or above this tier */
  minTier: ThreatTier;
  mitigations: Mitigation[];
};

const VECTORS: ThreatVector[] = [
  {
    id: "tracker",
    name: "Bluetooth tracker stalking",
    summary: "An AirTag/Tile/SmartTag slipped into a bag or vehicle reports your location to its owner.",
    minTier: "routine",
    mitigations: [
      { os: "android", text: "Run Settings → Safety & emergency → Unknown tracker alerts (manual scan), and install AirGuard for continuous background scanning.", why: "Cross-platform DULT alerts exist but are slow/unreliable on Android; AirGuard (TU Darmstadt) scans on-device.", source: "IETF DULT WG; AirGuard (SEEMOO, Apache-2.0)" },
      { os: "ios", text: "Act on any “Item Found Moving With You” alert and run Find My → Items → a manual scan.", why: "Apple's anti-stalking alerts can be bypassed by a cloned tag, so pair with a physical sweep.", source: "Apple newsroom 2024; PETS 2023 “Track You”" },
      { os: "all", text: "Physically sweep bags/vehicle for unfamiliar devices. If abuse is suspected, document before disabling.", why: "19% lifetime stalking prevalence; AirTags dominate tech-facilitated tracking.", source: "PETS 2024 “Please Unstalk Me”; CDC NISVS" },
    ],
  },
  {
    id: "imsi",
    name: "Cell-site simulator / 2G downgrade (IMSI catcher)",
    summary: "A fake base station forces your phone to 2G to strip encryption and capture identifiers/metadata.",
    minTier: "elevated",
    mitigations: [
      { os: "android", text: "Turn OFF “Allow 2G” (Settings → Network & internet → SIMs). On Pixel, enable cellular-security notifications.", why: "Disabling 2G removes the downgrade path simulators rely on (Android 12+).", source: "AOSP cellular-security docs" },
      { os: "ios", text: "Enable Lockdown Mode for high-risk travel — it disables 2G.", why: "iOS has no standalone 2G toggle; Lockdown Mode removes the fallback (iOS 17+).", source: "Apple / EFF" },
      { os: "all", text: "Don't trust civilian “IMSI-catcher detector” apps as proof; treat detection as indication only.", why: "Low-power attacks evade signal-anomaly detection; consumer detectors are unreliable.", source: "EFF Street-Level Surveillance; SeaGlass (UW)" },
    ],
  },
  {
    id: "radios",
    name: "Wi-Fi / Bluetooth probe fingerprinting",
    summary: "Your device's probe requests and BLE advertisements let networks re-identify and track it.",
    minTier: "elevated",
    mitigations: [
      { os: "all", text: "Turn Wi-Fi and Bluetooth fully OFF when not actively using them — do not rely on MAC randomization.", why: "Randomized MACs are re-linked to physical devices (~99%) via probe-request content/timing fingerprints.", source: "Vanhoef et al. 2016; “Bleach” 2024" },
      { os: "all", text: "Forget saved networks before travel so the device stops broadcasting their SSIDs.", why: "Probe-request SSID history is a strong cross-location tracking vector.", source: "Vanhoef et al. 2016" },
    ],
  },
  {
    id: "alpr",
    name: "Automated license-plate readers (ALPR)",
    summary: "Networked plate readers log vehicle movements at mass scale and retain them.",
    minTier: "elevated",
    mitigations: [
      { os: "all", text: "Vary routes and times; assume any vehicle trip is logged and queryable later.", why: "Flock-class ALPR performs ~20B scans/month across 5,000+ communities; searches have been abused.", source: "EFF ALPR investigations, 2025" },
      { os: "all", text: "Check the CCTV/ALPR map layer for known readers near sensitive destinations.", why: "DeFlock maps ~50k US readers into OSM (reachable via Greyline's map).", source: "DeFlock / EFF" },
    ],
  },
  {
    id: "frt",
    name: "Face recognition (FRT)",
    summary: "Public and law-enforcement face recognition can match you against posted imagery.",
    minTier: "high",
    mitigations: [
      { os: "all", text: "Awareness, not obstruction: covering your face is unreliable and may be unlawful. Reduce your posted face imagery instead (see the self-doxxing audit).", why: "FRT error/bias is large (10–100× false-positive differentials by demographic) yet deployment is widespread.", source: "NIST NISTIR 8280 (FRVT Part 3)" },
    ],
  },
  {
    id: "faraday",
    name: "Full signals isolation",
    summary: "At the highest tier, treat any powered radio as a continuous beacon.",
    minTier: "extreme",
    mitigations: [
      { os: "all", text: "Carry phones in a Faraday bag when not in use; power down fully at borders (enables disk encryption).", why: "Cell/Wi-Fi/BLE/GNSS radios all emit identifiable signals; a powered-off encrypted device resists forensic search.", source: "EFF border guidance; GRAY_MAN_TRADECRAFT.md" },
    ],
  },
];

/** The applicable vectors (filtered by tier) with mitigations filtered to the OS. */
export function buildThreatModel(os: DeviceOs, tier: ThreatTier): ThreatVector[] {
  const tierRank = TIER_RANK[tier];
  return VECTORS.filter((v) => TIER_RANK[v.minTier] <= tierRank).map((v) => ({
    ...v,
    mitigations: v.mitigations.filter((m) => m.os === "all" || m.os === os),
  }));
}
