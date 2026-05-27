import { PageHeader } from "@/components/page-header";
import { WeatherTool } from "@/components/tools/weather-tool";

export default function WeatherPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Weather"
        description="Search a destination for conditions, a 7-day forecast, and what it means for your trip — heat and UV risk, the best light for photography, and what to pack. Needs the weather connection on."
      />
      <WeatherTool />
    </div>
  );
}
