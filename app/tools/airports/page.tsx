import { PageHeader } from "@/components/page-header";
import { AirportsBrowser } from "@/components/tools/airports-browser";

export default function AirportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Airports"
        description="Search the offline airport database by name, city, IATA, or ICAO code. Codes, location, and elevation — no connection needed."
      />
      <AirportsBrowser />
    </div>
  );
}
