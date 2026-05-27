import { PageHeader } from "@/components/page-header";
import { SurveillanceLog } from "@/components/field/surveillance-log";
import { getSightings, repeatMatches, getRallyPoints } from "$server/db/repositories/field";

export const dynamic = "force-dynamic";

export default function SurveillancePage() {
  const sightings = getSightings();
  const repeats = repeatMatches();
  const rallyPoints = getRallyPoints();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Counter-surveillance"
        description="Log possible surveillance using the TEDD principle — the same party seen over Time, Environments, Distance, or with poor Demeanor. Observational and defensive; stored only on this machine."
      />
      <SurveillanceLog
        sightings={sightings}
        repeats={repeats}
        rallyPoints={rallyPoints}
      />
    </div>
  );
}
