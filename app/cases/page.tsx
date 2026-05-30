import { PageHeader } from "@/components/page-header";
import { CasesClient } from "@/components/cases/cases-client";
import { listCases } from "$server/db/repositories/cases";

export const dynamic = "force-dynamic";

export default function CasesPage() {
  const cases = listCases();
  return (
    <div className="space-y-8">
      <PageHeader
        title="Cases"
        description="Investigation case-files — group evidence with a SHA-256 integrity hash on every item and an append-only chain-of-custody trail. Everything stays on your machine."
        meta={[{ label: "Open", value: String(cases.filter((c) => c.status === "open").length) }]}
      />
      <CasesClient initial={cases} />
    </div>
  );
}
