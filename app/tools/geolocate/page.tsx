import { PageHeader } from "@/components/page-header";
import { Geolocator } from "@/components/tools/geolocator";

export const metadata = { title: "Feature-cluster geolocation · Greyline" };

export default function GeolocatePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Feature-cluster geolocation"
        description="Place a photo by the features you can see in it. Pick the distinctive landmarks — a mosque, a petrol station, a tram stop — and find where they co-occur within a short walk. Works offline over a pasted Overpass export, or live if you enable the Overpass connector."
        meta={[{ label: "Mode", value: "On-device ranking" }]}
      />
      <Geolocator />
    </div>
  );
}
