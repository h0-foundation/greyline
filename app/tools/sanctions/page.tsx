import { PageHeader } from "@/components/page-header";
import { SanctionsScreen } from "@/components/tools/sanctions-screen";

export const metadata = { title: "Sanctions screening · Greyline" };

export default function SanctionsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Sanctions screening"
        description="Check a person, company, or vessel against the US Treasury OFAC SDN and Consolidated lists — entirely on-device, over a bundled snapshot. No name you type ever leaves your machine."
        meta={[{ label: "Mode", value: "On-device" }, { label: "Source", value: "OFAC (US Treasury)" }]}
      />
      <SanctionsScreen />
    </div>
  );
}
