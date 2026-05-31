"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Hub-and-spoke trip workspace. The server page compiles every panel (dossier,
// flights, briefing, docs, packing) and passes the rendered sections in here;
// this client shell only owns which tab is active. All panels are force-mounted
// (same as the old single-scroll page) so form/checklist state survives tab
// switches and the briefing stays printable.
const TABS = [
  { value: "overview", label: "Overview" },
  { value: "flights", label: "Flights" },
  { value: "briefing", label: "Briefing" },
  { value: "documents", label: "Documents" },
  { value: "packing", label: "Packing" },
] as const;

export function TripTabs({
  overview,
  flights,
  briefing,
  documents,
  packing,
}: {
  overview: ReactNode;
  flights: ReactNode;
  briefing: ReactNode;
  documents: ReactNode;
  packing: ReactNode;
}) {
  const [tab, setTab] = useState<string>("overview");

  // Honour cockpit deep-links like /trips/[id]#flights without changing the
  // home page — map the hash to the matching tab on mount.
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (TABS.some((t) => t.value === h)) setTab(h);
  }, []);

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList className="flex flex-wrap">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="overview" forceMount className="space-y-6 data-[state=inactive]:hidden">{overview}</TabsContent>
      <TabsContent value="flights" forceMount className="space-y-4 data-[state=inactive]:hidden">{flights}</TabsContent>
      <TabsContent value="briefing" forceMount className="space-y-4 data-[state=inactive]:hidden">{briefing}</TabsContent>
      <TabsContent value="documents" forceMount className="space-y-4 data-[state=inactive]:hidden">{documents}</TabsContent>
      <TabsContent value="packing" forceMount className="space-y-4 data-[state=inactive]:hidden">{packing}</TabsContent>
    </Tabs>
  );
}
