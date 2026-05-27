import Link from "next/link";
import {
  ImageOff, Banknote, CloudSun, AlertTriangle, PlaneTakeoff, Stamp,
  Hotel, Luggage, ShieldCheck, Eye, Plane, ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

type Tool = { href: string; label: string; description: string; icon: React.ComponentType<{ className?: string }>; offline?: boolean };
type Group = { title: string; tools: Tool[] };

const GROUPS: Group[] = [
  {
    title: "On the ground",
    tools: [
      { href: "/tools/airports", label: "Airports", description: "Search 85k airports; codes, runways, nearest alternatives.", icon: PlaneTakeoff, offline: true },
      { href: "/tools/currency", label: "Currency", description: "Convert with live rates (cached). Connection optional.", icon: Banknote },
      { href: "/tools/weather", label: "Weather", description: "Forecast for any coordinates. Connection optional.", icon: CloudSun },
      { href: "/tools/advisories", label: "Advisories", description: "Government travel advisory levels.", icon: AlertTriangle },
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
      { href: "/tools/hotel", label: "Hotel & room security", description: "Room selection, door/window checks, TSCM sweep.", icon: Hotel, offline: true },
      { href: "/tools/border", label: "Border crossing", description: "Pre-trip, at-border, and post-crossing checklist.", icon: ShieldCheck, offline: true },
      { href: "/tools/self-doxxing", label: "Self-doxxing audit", description: "Find what the open internet reveals about you.", icon: Eye, offline: true },
    ],
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Tools"
        description="Field and privacy tools. Anything marked offline runs entirely on this machine; the rest use an optional connection you control in Settings."
      />
      {GROUPS.map((g) => (
        <section key={g.title} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">{g.title}</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.tools.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="group flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-text">
                    <t.icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-medium text-foreground group-hover:text-accent-text">
                      {t.label}
                      <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground text-pretty">{t.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
