import { Map } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function MapPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Map"
        description="An offline map with privacy and risk overlays."
      />
      <EmptyState
        icon={Map}
        title="The map is being rebuilt"
        description="Offline tiles and country overlays return in a later phase."
      />
    </div>
  );
}
