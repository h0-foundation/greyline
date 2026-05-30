import { PageHeader } from "@/components/page-header";
import { ViewshedTool } from "@/components/tools/viewshed-tool";

export const metadata = { title: "Line-of-sight exposure · Greyline" };

export default function ViewshedPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Line-of-sight exposure"
        description="Work out which observers — CCTV, a parked tail, a café window — actually have a clear line of sight to you, accounting for range and the walls between you. Pure geometry, computed on-device; nothing leaves your machine."
        meta={[{ label: "Mode", value: "On-device" }]}
      />
      <ViewshedTool />
    </div>
  );
}
