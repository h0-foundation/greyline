import { Compass } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function TripsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Trips"
        description="Plan, operate, and wrap your trips."
      />
      <EmptyState
        icon={Compass}
        title="Trip planning is coming next"
        description="The full trip lifecycle — destinations, the threat dial, and destination-aware OPSEC — arrives in the next build phase."
      />
    </div>
  );
}
