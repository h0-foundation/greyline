import { PageHeader } from "@/components/page-header";
import { SettingsClient } from "@/components/settings/settings-client";
import { getCountryListRows } from "$server/db/repositories/knowledge";
import { toListItem } from "@/lib/countries";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const countries = getCountryListRows()
    .map((r) => toListItem(r.country_code, r.rest_countries))
    .map((c) => ({ code: c.code, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Preferences, connections, and your data — all stored locally on this machine."
      />
      <SettingsClient countries={countries} />
    </div>
  );
}
