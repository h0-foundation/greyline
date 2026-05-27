import { PageHeader } from "@/components/page-header";
import { VisaChecker } from "@/components/tools/visa-checker";
import { getVisaPassports } from "$server/db/repositories/intel";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import { toListItem } from "@/lib/countries";

export const dynamic = "force-dynamic";

export default function VisaPage() {
  const passports = getVisaPassports();
  const names: Record<string, string> = {};
  for (const row of getCountryListRows()) {
    names[row.country_code] = toListItem(row.country_code, row.rest_countries).name;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visa checker"
        description="Pick your passport to see entry requirements for every destination in the offline matrix."
      />
      <VisaChecker passports={passports} names={names} />
    </div>
  );
}
