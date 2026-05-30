import { PageHeader } from "@/components/page-header";
import { RoutePlanner } from "@/components/field/route-planner";

export const dynamic = "force-dynamic";

export default function RoutePlannerPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Route planner (SDR / egress)"
        description="Plan surveillance-detection, extraction, and variation routes by drawing waypoints on the map. Length and deviation are computed on-device; routes are saved locally only. Defensive planning aid."
      />
      <RoutePlanner />
    </div>
  );
}
