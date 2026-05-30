import { PageHeader } from "@/components/page-header";
import { RosterClient } from "@/components/roster/roster-client";
import { listTravelers } from "$server/db/repositories/roster";
import { summarizeRoster } from "@/lib/roster";

export const dynamic = "force-dynamic";

export default function RosterPage() {
  const travelers = listTravelers();
  const summary = summarizeRoster(travelers.map((t) => t.checkin_status));
  return (
    <div className="space-y-8">
      <PageHeader
        title="Roster"
        description="Team duty of care — the people you're responsible for, their emergency details, and live check-in status. Local-only: nothing about your team leaves this machine."
        meta={[
          { label: "Travellers", value: String(summary.total) },
          { label: "Need attention", value: String(summary.sos + summary.overdue) },
        ]}
      />
      <RosterClient initial={travelers} />
    </div>
  );
}
