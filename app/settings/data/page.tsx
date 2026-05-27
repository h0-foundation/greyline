import { PageHeader } from "@/components/page-header";
import { DataManagement } from "@/components/settings/data-management";

export default function SettingsDataPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Your data"
        description="Back up, restore, or wipe everything Greyline has stored on this machine. Local files only — no cloud is involved."
      />
      <DataManagement />
    </div>
  );
}
