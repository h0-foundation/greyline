import { PageHeader } from "@/components/page-header";
import { BleTrackerDefense } from "@/components/tools/ble-tracker";

export default function BleTrackerPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Bluetooth tracker defense"
        description="Find and respond to an unwanted AirTag / Tile / SmartTag — phone-based detection per platform, a physical-sweep checklist, and safety-first guidance. Educational and offline; for continuous scanning use your OS's built-in scan or AirGuard."
      />
      <BleTrackerDefense />
    </div>
  );
}
