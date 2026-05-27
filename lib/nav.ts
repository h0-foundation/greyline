import {
  LayoutDashboard,
  Compass,
  Globe,
  Map,
  Wrench,
  Lock,
  Eye,
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

/** Primary, lifecycle-shaped navigation. */
export const primaryNav: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: LayoutDashboard,
    description: "Active trip and at-a-glance",
  },
  {
    label: "Trips",
    href: "/trips",
    icon: Compass,
    description: "Plan, operate, and wrap your trips",
  },
  {
    label: "Countries",
    href: "/countries",
    icon: Globe,
    description: "Briefings and what's captured about you",
  },
  {
    label: "Map",
    href: "/map",
    icon: Map,
    description: "Offline map and overlays",
  },
  {
    label: "Surveillance",
    href: "/surveillance",
    icon: Eye,
    description: "Counter-surveillance log and rally points",
  },
  {
    label: "Tools",
    href: "/tools",
    icon: Wrench,
    description: "Privacy and field tools",
  },
  {
    label: "Vault",
    href: "/vault",
    icon: Lock,
    description: "Encrypted document vault",
  },
];

/** Pinned to the bottom of the sidebar. */
export const footerNav: NavItem[] = [
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Preferences, connections, and data",
  },
];

export const allNav: NavItem[] = [...primaryNav, ...footerNav];

/** Longest-prefix match so nested routes (e.g. /trips/abc) light up their parent. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
