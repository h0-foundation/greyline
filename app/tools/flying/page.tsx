import {
  FileText,
  Database,
  Fingerprint,
  ScanFace,
  DoorOpen,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FlyingTrail } from "@/components/tools/flying-trail";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata = {
  title: "Data footprint of flying",
  description:
    "What API, PNR, and biometric systems capture when you fly — neutral, sourced, offline reference.",
};

type LinkRef = { label: string; href: string };
type Topic = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  body: React.ReactNode;
  links: LinkRef[];
};

const TOPICS: Topic[] = [
  {
    id: "api",
    title: "API — Advance Passenger Information",
    icon: FileText,
    summary: "Identity and flight data airlines transmit to destination and transit governments.",
    body: (
      <>
        <p>
          API is the set of passenger identity and flight details an airline sends to border
          authorities — typically the data on your passport&apos;s machine-readable zone (name, date
          of birth, nationality, document number and expiry) plus flight number and arrival/departure
          airports. It is usually transmitted at check-in and again at departure.
        </p>
        <p className="mt-2">
          The practice is anchored in ICAO Annex 9 (Facilitation) standards, and more than 100
          countries now require API. Border agencies use it to screen travelers against watchlists
          and immigration records before arrival.
        </p>
      </>
    ),
    links: [
      { label: "ICAO — API guidance", href: "https://www.icao.int/Security/FAL/SitePages/API-Guidelines-PNR-Reporting.aspx" },
      { label: "CBP — Advance Passenger Information System", href: "https://www.cbp.gov/travel/travel-industry-personnel/apis" },
    ],
  },
  {
    id: "pnr",
    title: "PNR — Passenger Name Record",
    icon: Database,
    summary: "Your full booking record, shared with many governments and retained for years.",
    body: (
      <>
        <p>
          A PNR is the booking record created in the airline or travel agency&apos;s reservation
          system. It is far richer than API and can include your full itinerary, payment details,
          contact information, seat assignment, baggage data, frequent-flyer number, travel agent,
          and the complete change history of the reservation.
        </p>
        <p className="mt-2">
          PNR data is shared with 60+ governments under bilateral agreements and national programs.
          Retention is measured in years: US CBP and Canada&apos;s CBSA retain PNR on the order of
          3.5 to 6 years (with portions de-personalized over time), and other states set their own
          periods.
        </p>
      </>
    ),
    links: [
      { label: "CBP — Passenger Name Record (PNR)", href: "https://www.cbp.gov/travel/travel-industry-personnel/pnr-resource-page" },
      { label: "ICAO — PNR Doc 9944 reference", href: "https://www.icao.int/Security/FAL/SitePages/API-Guidelines-PNR-Reporting.aspx" },
    ],
  },
  {
    id: "ees-etias",
    title: "EU Entry/Exit System (EES) + ETIAS",
    icon: Fingerprint,
    summary: "Biometric border records and a pre-travel authorization for the Schengen area.",
    body: (
      <>
        <p>
          The EU Entry/Exit System (EES) replaces manual passport stamping for non-EU travelers at
          Schengen external borders. On entry it records biometrics — fingerprints and a facial
          image — together with identity and travel-document data, and automatically calculates your
          allowance under the 90-days-in-any-180-days rule. EES is rolling out in stages during
          2025–2026.
        </p>
        <p className="mt-2">
          ETIAS is a separate, lighter pre-travel authorization for visa-exempt visitors — an online
          application tied to your passport, expected to begin roughly in 2026 (after EES). It is an
          authorization to travel, not a visa, and not the same dataset as EES.
        </p>
      </>
    ),
    links: [
      { label: "EU — Entry/Exit System (EES)", href: "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/smart-borders/entryexit-system_en" },
      { label: "EU — ETIAS", href: "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/smart-borders/european-travel-information-and-authorisation-system-etias_en" },
    ],
  },
  {
    id: "us-biometric",
    title: "US biometric entry/exit",
    icon: ScanFace,
    summary: "Facial capture at the border; retention differs for citizens and noncitizens.",
    body: (
      <>
        <p>
          US CBP operates a facial-comparison program at many ports of entry and exit, matching a
          live photo against images already on file (passports, visas, prior crossings). For US
          citizens, CBP states the new photos are typically discarded shortly after the match.
        </p>
        <p className="mt-2">
          For most noncitizens, captured facial images can be retained long-term in DHS systems.
          US citizens may generally decline the photo and request alternative processing; rules and
          signage vary by location.
        </p>
      </>
    ),
    links: [
      { label: "CBP — Biometrics / facial comparison", href: "https://www.cbp.gov/travel/biometrics" },
    ],
  },
  {
    id: "transit",
    title: "Transit & sterile zones",
    icon: DoorOpen,
    summary: "Whether you clear immigration in transit — and why minimum connection time isn't a buffer.",
    body: (
      <>
        <p>
          Airside (the &quot;sterile&quot; zone past security) is separate from landside. In many
          countries an international-to-international connection keeps you airside without a formal
          entry. But some countries — notably the United States and Canada — have no airside transit
          zone: connecting passengers must clear immigration and customs, then re-enter security,
          even if only changing planes.
        </p>
        <p className="mt-2">
          That means you may need a transit visa (or US ESTA / Canadian eTA) just to connect. Always
          confirm transit requirements for your passport and route. And treat the published Minimum
          Connection Time (MCT) as a booking floor the airline will sell, not a safe buffer — border
          clearance, immigration queues, and terminal changes can easily exceed it.
        </p>
      </>
    ),
    links: [
      { label: "Wikivoyage — Airport transit (sterile transit)", href: "https://en.wikivoyage.org/wiki/Airport_transit" },
    ],
  },
];

function SourceLinks({ links }: { links: LinkRef[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3">
      <span className="text-xs text-faint">Sources:</span>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-accent-text hover:underline"
        >
          {link.label}
          <ExternalLink className="size-3" />
        </a>
      ))}
    </div>
  );
}

export default function FlyingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Data footprint of flying"
        description="A calm, factual map of the identity and biometric systems that record you when you fly. Offline reference — no data leaves this machine."
      />

      <FlyingTrail />

      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <p className="max-w-prose text-sm text-muted-foreground text-pretty">
          Air travel generates several overlapping records. Airlines send identity and flight data
          to governments before you arrive; your booking is retained for years; and a growing number
          of borders capture biometrics. None of this is unusual or hidden — the goal here is to
          understand what is collected, by whom, and for how long, so you can plan with eyes open.
        </p>
      </section>

      <Accordion type="multiple" className="rounded-xl border border-border bg-card px-5 shadow-xs">
        {TOPICS.map((topic) => (
          <AccordionItem key={topic.id} value={topic.id}>
            <AccordionTrigger>
              <span className="flex items-start gap-3">
                <topic.icon className="mt-0.5 size-4 shrink-0 text-accent-text" />
                <span className="min-w-0">
                  <span className="block font-display text-foreground">{topic.title}</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground text-pretty">
                    {topic.summary}
                  </span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground text-pretty">
              <div className="pl-7">
                {topic.body}
                <SourceLinks links={topic.links} />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p className="text-[11px] text-faint">
        Reference only; rules change — verify before you fly.
      </p>
    </div>
  );
}
