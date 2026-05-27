import { Wrench } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tools" description="Privacy and field tools." />
      <EmptyState
        icon={Wrench}
        title="Tools are being ported"
        description="EXIF stripping, currency, weather, advisories, and more return soon — all offline by default."
      />
    </div>
  );
}
