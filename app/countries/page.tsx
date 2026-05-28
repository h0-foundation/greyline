import { PageHeader } from "@/components/page-header";
import { CountriesBrowser } from "@/components/countries/countries-browser";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import { getPeakAdvisories } from "$server/db/repositories/dossier";
import { toListItem } from "@/lib/countries";

// Reads local SQLite at request time.
export const dynamic = "force-dynamic";

export default function CountriesPage() {
  const countries = getCountryListRows().map((r) =>
    toListItem(r.country_code, r.rest_countries),
  );
  // Roll-up across all advisory sources — passed in so each row shows the
  // highest-severity level and the browser can filter on it. This replaces
  // the old standalone /tools/advisories tool.
  const peakMap = getPeakAdvisories();
  const advisories: Record<string, { level: number; label: string; sources: number }> = {};
  for (const [iso2, p] of peakMap) {
    advisories[iso2] = { level: p.level, label: p.level_label, sources: p.sources_count };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Countries"
        description="Briefings and what's captured about you, country by country. Travel advisories from every source we pull are folded in — filter or click any country for the full dossier."
      />
      <CountriesBrowser countries={countries} advisories={advisories} />
    </div>
  );
}
