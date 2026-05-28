// Collapsible CIA World Factbook highlights — Government, Economy, People,
// Comms, Transport, Military. Each section opens on click; keeps the dossier
// scannable but lets the curious dig in.
import { Building2, BarChart3, Users, Antenna, TrainFront, Shield } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { FactbookHighlights } from "$server/db/repositories/dossier";

function clean(s: string | null): string {
  if (!s) return "";
  // Factbook free-text often has parenthetical years/ranges. Trim and tidy.
  return s.replace(/\s+/g, " ").trim();
}

function Row({ k, v }: { k: string; v: string | null }) {
  const text = clean(v);
  if (!text) return null;
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-[10rem_1fr]">
      <dt className="label-caps text-faint sm:pt-0.5">{k}</dt>
      <dd className="text-sm text-foreground text-pretty">{text}</dd>
    </div>
  );
}

export function FactbookPanel({ fb }: { fb: FactbookHighlights | null }) {
  if (!fb) {
    return (
      <p className="text-sm text-muted-foreground">
        No Factbook entry on file for this country. Run <span className="font-mono text-xs">pnpm build:dossier</span>.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {fb.background && (
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {clean(fb.background)}
        </p>
      )}
      <Accordion type="multiple" className="space-y-1">
        <AccordionItem value="gov" className="border-border">
          <AccordionTrigger className="text-sm">
            <span className="inline-flex items-center gap-2"><Building2 className="size-4 text-faint" /> Government</span>
          </AccordionTrigger>
          <AccordionContent>
            <dl className="space-y-2.5 py-1">
              <Row k="Type" v={fb.government.governmentType} />
              <Row k="Capital" v={fb.government.capital} />
              <Row k="Independence" v={fb.government.independence} />
              <Row k="Legal system" v={fb.government.legalSystem} />
              <Row k="Suffrage" v={fb.government.suffrage} />
              <Row k="Constitution" v={fb.government.constitution} />
            </dl>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="econ" className="border-border">
          <AccordionTrigger className="text-sm">
            <span className="inline-flex items-center gap-2"><BarChart3 className="size-4 text-faint" /> Economy</span>
          </AccordionTrigger>
          <AccordionContent>
            <dl className="space-y-2.5 py-1">
              <Row k="GDP per capita" v={fb.economy.gdpPerCapita} />
              <Row k="Unemployment" v={fb.economy.unemployment} />
              <Row k="Inflation" v={fb.economy.inflation} />
              <Row k="Gini index" v={fb.economy.gini} />
              <Row k="Labor force" v={fb.economy.laborForce} />
              <Row k="Overview" v={fb.economy.overview} />
            </dl>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="people" className="border-border">
          <AccordionTrigger className="text-sm">
            <span className="inline-flex items-center gap-2"><Users className="size-4 text-faint" /> People &amp; society</span>
          </AccordionTrigger>
          <AccordionContent>
            <dl className="space-y-2.5 py-1">
              <Row k="Population" v={fb.people.population} />
              <Row k="Languages" v={fb.people.languages} />
              <Row k="Religions" v={fb.people.religions} />
              <Row k="Median age" v={fb.people.medianAge} />
              <Row k="Life expectancy" v={fb.people.lifeExpectancy} />
              <Row k="Literacy" v={fb.people.literacy} />
            </dl>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="comms" className="border-border">
          <AccordionTrigger className="text-sm">
            <span className="inline-flex items-center gap-2"><Antenna className="size-4 text-faint" /> Communications</span>
          </AccordionTrigger>
          <AccordionContent>
            <dl className="space-y-2.5 py-1">
              <Row k="Internet TLD" v={fb.comms.internetCountryCode} />
              <Row k="Internet penetration" v={fb.comms.internetUsers} />
            </dl>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="transport" className="border-border">
          <AccordionTrigger className="text-sm">
            <span className="inline-flex items-center gap-2"><TrainFront className="size-4 text-faint" /> Transportation</span>
          </AccordionTrigger>
          <AccordionContent>
            <dl className="space-y-2.5 py-1">
              <Row k="Registered carriers" v={fb.transport.airports} />
              <Row k="Railways" v={fb.transport.railways} />
              <Row k="Roadways" v={fb.transport.roadways} />
            </dl>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="mil" className="border-border">
          <AccordionTrigger className="text-sm">
            <span className="inline-flex items-center gap-2"><Shield className="size-4 text-faint" /> Military &amp; security</span>
          </AccordionTrigger>
          <AccordionContent>
            <dl className="space-y-2.5 py-1">
              <Row k="Service branches" v={fb.military.serviceBranches} />
              <Row k="Expenditure" v={fb.military.expenditure} />
            </dl>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
