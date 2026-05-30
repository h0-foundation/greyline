import { PageHeader } from "@/components/page-header";
import { AlertLayer } from "@/components/tools/alert-layer";

export const metadata = { title: "Hazard alerts · Greyline" };

export default function AlertsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Hazard alerts"
        description="A rationalized hazard layer (EEMUA-191): the GDACS disaster and USGS earthquake feeds, de-duplicated, prioritised by severity and proximity, and flood-suppressed — so you get a short, ranked, actionable list instead of a marker flood. Works live with the connectors on, or offline over a pasted feed."
        meta={[{ label: "Method", value: "EEMUA-191" }]}
      />
      <AlertLayer />
    </div>
  );
}
