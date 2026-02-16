// ---------------------------------------------------------------------------
// SavedRoute & RallyPoint types
// ---------------------------------------------------------------------------

export type RouteType = 'sdr' | 'extraction' | 'variation' | 'normal';

/** A single waypoint along a route. */
export interface Waypoint {
  lat: number;
  lng: number;
  label?: string;
}

/** GeoJSON-compatible geometry stored with a route. */
export interface RouteGeometry {
  type: 'LineString' | 'MultiLineString';
  coordinates: number[][] | number[][][];
}

// ---- Core entities --------------------------------------------------------

export interface SavedRoute {
  id: string;
  trip_id: string | null;
  type: RouteType | null;
  name: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  /** Stored as JSON in the database; parsed into Waypoint[]. */
  waypoints: Waypoint[];
  /** Stored as JSON in the database; parsed into RouteGeometry. */
  geometry: RouteGeometry | null;
  /** Distance in metres. */
  distance_m: number | null;
  /** Duration in seconds. */
  duration_s: number | null;
  notes: string | null;
  created_at: string | null;
}

export interface RallyPoint {
  id: string;
  trip_id: string | null;
  name: string | null;
  lat: number | null;
  lng: number | null;
  /** ISO-8601 time string for the start of the rally window. */
  time_start: string | null;
  /** ISO-8601 time string for the end of the rally window. */
  time_end: string | null;
  /** ID of a fallback rally point if this one is compromised. */
  fallback_id: string | null;
  instructions: string | null;
}
