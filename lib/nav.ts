import {
  LayoutDashboard,
  Compass,
  BookText,
  Globe,
  Map,
  Wrench,
  Lock,
  Eye,
  FolderSearch,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Plain-language description — used in tooltips and the command palette. */
  description: string;
};

export type NavGroup = {
  /** Optional section heading; omit for the pinned top item(s). */
  heading?: string;
  items: NavItem[];
};

/* Goal-based grouping (NN/G: chunk many destinations into a few meaningful
 * groups rather than a flat list). Home is pinned; the three groups map to the
 * product's lifecycle and pillars — Plan & brief (travel-risk lead), Field
 * (counter-surveillance + journalism tools), Record (lifetime log + vault). */
export const navGroups: NavGroup[] = [
  {
    items: [
      { label: "Home", href: "/", icon: LayoutDashboard, description: "Cockpit — what needs your attention now" },
    ],
  },
  {
    heading: "Plan & brief",
    items: [
      { label: "Trips", href: "/trips", icon: Compass, description: "Plan and operate active trips" },
      { label: "Countries", href: "/countries", icon: Globe, description: "Briefings and what's captured about you" },
      { label: "Map", href: "/map", icon: Map, description: "Offline map and live overlays" },
    ],
  },
  {
    heading: "Field",
    items: [
      { label: "Surveillance", href: "/surveillance", icon: Eye, description: "Counter-surveillance log and rally points" },
      { label: "Cases", href: "/cases", icon: FolderSearch, description: "Investigation case-files with chain-of-custody" },
      { label: "Roster", href: "/roster", icon: Users, description: "Team duty-of-care: travellers, check-ins, and SOS" },
      { label: "Tools", href: "/tools", icon: Wrench, description: "Privacy, field, and verification tools" },
    ],
  },
  {
    heading: "Record",
    items: [
      { label: "Logbook", href: "/logbook", icon: BookText, description: "Your lifetime atlas and wrapped trips" },
      { label: "Vault", href: "/vault", icon: Lock, description: "Encrypted document vault" },
    ],
  },
];

/** Flat primary list (derived) — for the command palette and any flat consumer. */
export const primaryNav: NavItem[] = navGroups.flatMap((g) => g.items);

/** Pinned to the bottom of the sidebar. */
export const footerNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings, description: "Preferences, connections, and data" },
];

export const allNav: NavItem[] = [...primaryNav, ...footerNav];

/** Longest-prefix match so nested routes (e.g. /trips/abc) light up their parent. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
