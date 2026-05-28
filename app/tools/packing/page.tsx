import { PageHeader } from "@/components/page-header";
import { ChecklistTool, type ChecklistSection } from "@/components/tools/checklist-tool";

const SECTIONS: ChecklistSection[] = [
  {
    title: "Documents",
    items: [
      "Passport valid for at least 6 months beyond your return date.",
      "Photocopies (or encrypted scans) of passport and visas, stored separately from the originals.",
      "Travel insurance details and the 24-hour assistance number.",
      "Emergency contact card with names and numbers.",
    ],
  },
  {
    title: "Money",
    items: [
      "At least two payment cards on different networks (e.g. Visa and Mastercard).",
      "Some local cash in small denominations for arrival.",
      "A hidden cash reserve kept separate from your wallet.",
    ],
  },
  {
    title: "Electronics",
    items: [
      "Phone loaded with offline maps for your destination.",
      "Power bank and charging cables.",
      "Universal travel adapter.",
      "USB data-blocker for charging at public ports.",
      "VPN installed and tested before departure.",
    ],
  },
  {
    title: "Security & OPSEC",
    items: [
      "Door wedge or portable travel lock.",
      "Faraday bag for keys, phone, or cards when you want them dark.",
      "Webcam cover for laptop and tablet.",
      "Privacy screen for laptop or phone in public.",
      "Tamper-evident tape to detect bag or device interference.",
    ],
  },
  {
    title: "Health",
    items: [
      "Medications in their original, labeled packaging.",
      "Compact first-aid kit.",
      "Hand sanitizer and any personal hygiene essentials.",
    ],
  },
  {
    title: "Clothing — gray man",
    items: [
      "Neutral, muted colors that blend with the local crowd.",
      "No logos, slogans, or country/team identifiers.",
      "Broken-in, comfortable shoes you can walk and move quickly in.",
      "Layers you can add or shed to adapt to weather and setting.",
    ],
  },
];

export default function PackingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Packing"
        description="A threat-aware packing checklist covering documents, money, electronics, OPSEC gear, health, and blending-in clothing. Runs offline; your check-state stays on this machine."
      />
      <ChecklistTool
        toolKey="packing"
        intro="A practical, defensive packing list for low-profile travel. Tailor it to your destination, season, and threat level — pack only what the trip genuinely needs, since carrying less reduces both weight and exposure."
        sections={SECTIONS}
      />
    </div>
  );
}
