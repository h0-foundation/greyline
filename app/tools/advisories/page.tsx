import { PageHeader } from "@/components/page-header";
import { AdvisoriesList } from "@/components/tools/advisories-list";

export default function AdvisoriesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Advisories"
        description="Government travel advisory levels by country, from an optional connection you control in Settings."
      />
      <AdvisoriesList />
    </div>
  );
}
