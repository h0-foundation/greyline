import { PageHeader } from "@/components/page-header";
import { WeatherTool } from "@/components/tools/weather-tool";

export default function WeatherPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Weather"
        description="Current conditions and a 7-day forecast for any coordinates. Works only while the optional weather connection is on."
      />
      <WeatherTool />
    </div>
  );
}
