import { PageHeader } from "@/components/page-header";
import { CountriesBrowser } from "@/components/countries/countries-browser";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import { toListItem } from "@/lib/countries";

// Reads local SQLite at request time.
export const dynamic = "force-dynamic";

export default function CountriesPage() {
  const countries = getCountryListRows().map((r) =>
    toListItem(r.country_code, r.rest_countries),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Countries"
        description="Briefings and what's captured about you, country by country. All loaded locally — nothing leaves your machine."
      />
      <CountriesBrowser countries={countries} />
    </div>
  );
}
