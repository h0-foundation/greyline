import { PageHeader } from "@/components/page-header";
import { MapView, type MapMarker } from "@/components/map/map-view";
import { getSightings, getRallyPoints } from "$server/db/repositories/field";
import { getAllTrips, getDestinationsByTrip } from "$server/db/repositories/trip";

export const dynamic = "force-dynamic";

type DestinationRow = {
  id: string;
  city: string | null;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
};

type TripRow = { id: string };

export default function MapPage() {
  const markers: MapMarker[] = [];

  // Destinations across all trips (only those with coordinates).
  const trips = getAllTrips() as TripRow[];
  for (const trip of trips) {
    const destinations = getDestinationsByTrip(trip.id) as DestinationRow[];
    for (const d of destinations) {
      if (d.lat == null || d.lng == null) continue;
      const label = [d.city, d.country_code].filter(Boolean).join(", ") || "Destination";
      markers.push({ id: `dest-${d.id}`, type: "destination", lat: d.lat, lng: d.lng, label });
    }
  }

  // Rally points (lat/lng are non-nullable).
  for (const r of getRallyPoints()) {
    markers.push({ id: `rally-${r.id}`, type: "rally", lat: r.lat, lng: r.lng, label: r.name });
  }

  // Logged sightings (only those with coordinates).
  for (const s of getSightings()) {
    if (s.lat == null || s.lng == null) continue;
    const label = s.description?.trim() || "Sighting";
    markers.push({ id: `sighting-${s.id}`, type: "sighting", lat: s.lat, lng: s.lng, label });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Map"
        description="Offline map of your destinations, rally points, and logged sightings. Map data © OpenStreetMap contributors."
      />
      <MapView markers={markers} />
    </div>
  );
}
