import { PageHeader } from "@/components/page-header";
import { ChronoLab } from "@/components/tools/chrono-lab";

export default function ChronoPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Chronolocation lab"
        description="Verify when and where a photo was taken from its shadows. Compute the sun's position for any place and time, or work backwards from a shadow's length to the time of day. Runs entirely on this machine."
      />
      <ChronoLab />
    </div>
  );
}
