import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getPackingTemplates } from "$server/db/repositories/templates";
import { PackingExplorer } from "@/components/tools/packing-explorer";

// Reads bundled SQLite at request time.
export const dynamic = "force-dynamic";

export default function PackingPage() {
  const templates = getPackingTemplates();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Packing"
        description="The bundled packing library — climate-, activity-, and threat-tiered. For a trip-aware list with persistent check-state, open any trip's Packing section."
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-accent-subtle/40 p-4">
        <ListChecks className="size-4 text-accent-text" />
        <p className="text-sm text-muted-foreground text-pretty">
          On any trip, Greyline auto-generates a personalised packing list from your destinations'
          climate (inferred from latitude) + threat tier + selected activities, persisted on this
          machine.
        </p>
        <Link
          href="/trips"
          className="ml-auto inline-flex items-center gap-1 text-sm text-accent-text hover:underline"
        >
          Open a trip <ArrowRight className="size-4" />
        </Link>
      </div>

      <PackingExplorer templates={templates} />
    </div>
  );
}
