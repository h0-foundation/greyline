import { PageHeader } from "@/components/page-header";
import { TripsClient } from "@/components/trip/trips-client";
import { getAllTrips } from "$server/db/repositories/trip";

export const dynamic = "force-dynamic";

export type TripRow = {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  updated_at: string;
};

export default function TripsPage() {
  const trips = getAllTrips() as TripRow[];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Trips"
        description="Plan, operate, and wrap your trips. Each carries its own threat model, destinations, and OPSEC — stored only on this machine."
      />
      <TripsClient initialTrips={trips} />
    </div>
  );
}
