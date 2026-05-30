import { PageHeader } from "@/components/page-header";
import { EmergencyTool } from "@/components/tools/emergency-card";
import { getAllCountrySummaries } from "$server/db/repositories/knowledge";
import { getCountryPractical } from "$server/db/repositories/intel";

export const dynamic = "force-dynamic";

export default async function EmergencyPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const summaries = getAllCountrySummaries();
  const code = (c || "").toUpperCase();
  const selected = code ? summaries.find((s) => s.country_code === code) ?? null : null;
  const practical = code ? getCountryPractical(code) : undefined;

  let emergency: { police?: string; ambulance?: string; fire?: string; general?: string } = {};
  try {
    emergency = practical?.emergency_numbers ? JSON.parse(practical.emergency_numbers) : {};
  } catch {
    emergency = {};
  }
  const power = practical
    ? [practical.plug_types, practical.voltage, practical.frequency].filter(Boolean).join(" · ") || null
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Emergency card"
        description="Per-country emergency numbers and a printable panic card. Pick a destination, print or save it before you go. Offline; built from bundled data."
      />
      <EmergencyTool
        summaries={summaries.map((s) => ({ country_code: s.country_code, name: s.name, flag: s.flag }))}
        code={code}
        country={selected ? { name: selected.name, flag: selected.flag } : null}
        emergency={emergency}
        power={power}
      />
    </div>
  );
}
