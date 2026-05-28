import { PageHeader } from "@/components/page-header";
import { CurrencyConverter } from "@/components/tools/currency-converter";
import { getSetting } from "$server/db/repositories/settings";

export const dynamic = "force-dynamic";

export default function CurrencyPage() {
  const homeCurrency = (getSetting("home_currency") ?? "").replace(/"/g, "") || undefined;
  return (
    <div className="space-y-8">
      <PageHeader
        title="Currency"
        description="Convert between currencies using cached exchange rates. Works only while the optional currency connection is on."
      />
      <CurrencyConverter homeCurrency={homeCurrency} />
    </div>
  );
}
