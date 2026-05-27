import { PageHeader } from "@/components/page-header";
import { AirportsBrowser } from "@/components/tools/airports-browser";

export default function AirportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Airports"
        description="Plan air egress from any place — the nearest scheduled-service airports ranked by distance, bearing, and drive time, with an overland-dispersion check — or search 85,000+ airports by name or code. Fully offline."
      />
      <AirportsBrowser />
    </div>
  );
}
