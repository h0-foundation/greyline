import { PageHeader } from "@/components/page-header";
import { ChecklistTool, type ChecklistSection } from "@/components/tools/checklist-tool";
import { BorderPrep } from "@/components/tools/border-prep";
import { getIntelCoverage } from "$server/db/repositories/intel";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import { toListItem } from "@/lib/countries";

export const dynamic = "force-dynamic";

const SECTIONS: ChecklistSection[] = [
  {
    title: "Before you travel",
    items: [
      "Enable full-disk encryption on every device and confirm it is actually on.",
      "Minimize the data you carry — bring only what the trip requires.",
      "Move sensitive data to an encrypted backup and remove the local copies before you leave.",
      "Review the social-media accounts and apps signed in on your devices.",
      "Know your rights for your traveler status (citizen, resident, or visa holder) — they differ significantly.",
      "Decide whether to carry a burner or clean device instead of your primary one.",
    ],
  },
  {
    title: "At the crossing",
    items: [
      "Power devices fully OFF before reaching the inspection line (encryption protections are strongest when powered down).",
      "Be truthful with officers — do not lie or provide false documents.",
      "Understand that you can decline to unlock or hand over a device, but the consequences vary by your traveler status.",
      "Note what is asked of you: which devices, which accounts, and whether a device left your sight.",
    ],
  },
  {
    title: "After crossing",
    items: [
      "If a device was out of your sight, assume it may be compromised until you can verify it.",
      "Change the credentials for any account or device that was taken or unlocked.",
      "Log the incident: date, location, agency, officers, devices, and what was requested.",
    ],
  },
];

export default function BorderCrossingPage() {
  // Build the destination picker from the curated-intel coverage set, labelled
  // with country names from the offline knowledge base.
  const coverageSet = getIntelCoverage();
  const names: Record<string, string> = {};
  for (const row of getCountryListRows()) {
    names[row.country_code] = toListItem(row.country_code, row.rest_countries).name;
  }
  const coverage = [...coverageSet]
    .map((iso2) => ({ iso2, name: names[iso2] ?? iso2 }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-10">
      <PageHeader
        title="Border crossing"
        description="A device-prep decision engine: pick your destination, status, and threat level to get a personalized exposure score and a phase-grouped action plan. Runs offline; nothing is recorded off this machine."
      />

      <BorderPrep coverage={coverage} />

      <div className="space-y-4">
        <div className="h-px w-full bg-border" />
        <h2 className="font-display text-2xl font-medium text-foreground">
          Generic walkthrough
        </h2>
        <ChecklistTool
          toolKey="border"
          intro="Informational, not legal advice. Border-search powers and your rights depend heavily on your citizenship and the country you are entering — consult a qualified attorney for your situation. This checklist is adapted from the EFF's border-search guidance (Digital Privacy at the U.S. Border) and applies general data-hygiene principles."
          sections={SECTIONS}
        />
      </div>
    </div>
  );
}
