import { PageHeader } from "@/components/page-header";
import { CurrencyConverter } from "@/components/tools/currency-converter";

export default function CurrencyPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Currency"
        description="Convert between currencies using cached exchange rates. Works only while the optional currency connection is on."
      />
      <CurrencyConverter />
    </div>
  );
}
