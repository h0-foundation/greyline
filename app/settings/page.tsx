import { PageHeader } from "@/components/page-header";
import { SettingsClient } from "@/components/settings/settings-client";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Preferences, connections, and your data — all stored locally on this machine."
      />
      <SettingsClient />
    </div>
  );
}
