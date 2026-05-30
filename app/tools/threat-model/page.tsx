import { PageHeader } from "@/components/page-header";
import { ThreatModelWizard } from "@/components/tools/threat-model";

export default function ThreatModelPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Threat-model wizard"
        description="Build a defensive digital-signature plan for your device and risk level — IMSI catchers, Wi-Fi/BLE fingerprinting, ALPR, Bluetooth trackers, face recognition. Each step cites why and the source. Runs entirely on this machine."
      />
      <ThreatModelWizard />
    </div>
  );
}
