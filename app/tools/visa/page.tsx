import { PageHeader } from "@/components/page-header";
import { VisaChecker } from "@/components/tools/visa-checker";
import { getVisaPassports } from "$server/db/repositories/intel";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import { getSetting } from "$server/db/repositories/settings";
import { toListItem } from "@/lib/countries";

export const dynamic = "force-dynamic";

export default function VisaPage() {
  const passports = getVisaPassports();
  const names: Record<string, string> = {};
  for (const row of getCountryListRows()) {
    names[row.country_code] = toListItem(row.country_code, row.rest_countries).name;
  }
  const initialPassport = (getSetting("passport_country") ?? "").replace(/"/g, "") || undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visa checker"
        description="Run the Schengen 90/180 and passport-validity calculators, then browse entry requirements for every destination in the offline matrix."
      />
      <VisaChecker passports={passports} names={names} initialPassport={initialPassport} />
    </div>
  );
}
