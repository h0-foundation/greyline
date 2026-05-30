import {
  ImageOff, Banknote, CloudSun, AlertTriangle, PlaneTakeoff, Stamp,
  Hotel, Luggage, ShieldCheck, Eye, Plane, Sun, ShieldAlert, Radar, Route, Search, Siren, type LucideIcon,
} from "lucide-react";

/* Single source of truth for the tools catalog. Consumed by the /tools index
 * page AND the Cmd+K command palette so the two can never drift (the palette
 * previously hardcoded a stale list pointing at a removed /tools/advisories). */

export type Tool = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** true when the tool runs entirely on-device with no optional connection. */
  offline?: boolean;
};

export type ToolGroup = { title: string; tools: Tool[] };

export const TOOL_GROUPS: ToolGroup[] = [
  {
    title: "On the ground",
    tools: [
      { href: "/tools/airports", label: "Airports", description: "Search 85k airports; codes, runways, nearest alternatives.", icon: PlaneTakeoff, offline: true },
      { href: "/tools/currency", label: "Currency", description: "Convert with live rates (cached). Connection optional.", icon: Banknote },
      { href: "/tools/weather", label: "Weather", description: "Forecast for any coordinates. Connection optional.", icon: CloudSun },
      { href: "/countries?advisory=2", label: "Travel advisories", description: "Multi-government advisories (US State, UK FCDO) — folded into Countries.", icon: AlertTriangle },
      { href: "/tools/emergency", label: "Emergency card", description: "Per-country emergency numbers + a printable panic card. Offline.", icon: Siren, offline: true },
    ],
  },
  {
    title: "Before you go",
    tools: [
      { href: "/tools/visa", label: "Visa checker", description: "Your passport → any destination, from the offline matrix.", icon: Stamp, offline: true },
      { href: "/tools/exif", label: "EXIF stripper", description: "Remove GPS/device metadata from photos. Never leaves your machine.", icon: ImageOff, offline: true },
      { href: "/tools/packing", label: "Packing", description: "Threat-aware packing checklist.", icon: Luggage, offline: true },
      { href: "/tools/flying", label: "Data footprint of flying", description: "What API/PNR/biometric systems capture when you fly.", icon: Plane, offline: true },
    ],
  },
  {
    title: "Security",
    tools: [
      { href: "/tools/threat-model", label: "Threat-model wizard", description: "Device + risk-level signature plan: IMSI catchers, Wi-Fi/BLE, ALPR, trackers, FRT — with sources.", icon: ShieldAlert, offline: true },
      { href: "/tools/ble-tracker", label: "Bluetooth tracker defense", description: "Find an unwanted AirTag/Tile/SmartTag — per-phone detection, physical sweep, safety-first.", icon: Radar, offline: true },
      { href: "/tools/route-planner", label: "Route planner (SDR / egress)", description: "Draw surveillance-detection, extraction & variation routes; on-device length + deviation.", icon: Route, offline: true },
      { href: "/tools/hotel", label: "Hotel & room security", description: "Room selection, door/window checks, TSCM sweep.", icon: Hotel, offline: true },
      { href: "/tools/border", label: "Border crossing", description: "Pre-trip, at-border, and post-crossing checklist.", icon: ShieldCheck, offline: true },
      { href: "/tools/self-doxxing", label: "Self-doxxing audit", description: "Find what the open internet reveals about you.", icon: Eye, offline: true },
    ],
  },
  {
    title: "Verify & investigate",
    tools: [
      { href: "/tools/verify", label: "Verify & protect sources", description: "SIFT + lateral reading, image/video verification, and source-protection playbooks.", icon: Search, offline: true },
      { href: "/tools/chrono", label: "Chronolocation lab", description: "Date and place a photo from its shadows — sun position + reverse time-of-day, all local.", icon: Sun, offline: true },
    ],
  },
];

/** Flat list (derived) — for the command palette and any flat consumer. */
export const allTools: Tool[] = TOOL_GROUPS.flatMap((g) => g.tools);
