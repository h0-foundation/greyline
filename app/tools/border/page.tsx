import { PageHeader } from "@/components/page-header";
import { ChecklistTool, type ChecklistSection } from "@/components/tools/checklist-tool";

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
  return (
    <div className="space-y-8">
      <PageHeader
        title="Border crossing"
        description="A pre-trip, at-the-border, and post-crossing checklist for protecting your data and knowing your options. Runs offline; nothing is recorded off this machine."
      />
      <ChecklistTool
        toolKey="border"
        intro="Informational, not legal advice. Border-search powers and your rights depend heavily on your citizenship and the country you are entering — consult a qualified attorney for your situation. This checklist is adapted from the EFF's border-search guidance (Digital Privacy at the U.S. Border) and applies general data-hygiene principles."
        sections={SECTIONS}
      />
    </div>
  );
}
