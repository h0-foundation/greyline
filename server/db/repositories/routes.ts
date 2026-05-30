import { getDb } from "../index";
import { v4 as uuid } from "uuid";

// Saved routes (SDR / extraction / variation / normal). The `type` is checked
// against an allowlist here as well as by the table's CHECK constraint; no
// caller-supplied value ever reaches SQL as an identifier (no injection).

export interface SavedRoute {
  id: string;
  trip_id: string | null;
  type: string;
  name: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  waypoints: string; // JSON: [{ lng, lat }, ...]
  geometry: string | null;
  distance_m: number | null;
  duration_s: number | null;
  notes: string | null;
  created_at: string;
}

const VALID_TYPES = new Set(["sdr", "extraction", "variation", "normal"]);

export function getRoutes(tripId?: string): SavedRoute[] {
  const db = getDb();
  if (tripId) {
    return db.prepare("SELECT * FROM saved_routes WHERE trip_id = ? ORDER BY created_at DESC").all(tripId) as SavedRoute[];
  }
  return db.prepare("SELECT * FROM saved_routes ORDER BY created_at DESC").all() as SavedRoute[];
}

export function createRoute(input: {
  trip_id?: string | null;
  type: string;
  name?: string | null;
  waypoints: { lng: number; lat: number }[];
  distance_m?: number | null;
  notes?: string | null;
}): SavedRoute {
  if (!VALID_TYPES.has(input.type)) throw new Error("invalid route type");
  const pts = (input.waypoints ?? []).filter((p) => Number.isFinite(p?.lng) && Number.isFinite(p?.lat));
  if (pts.length < 2) throw new Error("at least 2 waypoints required");
  const id = uuid();
  const origin = pts[0];
  const dest = pts[pts.length - 1];
  getDb()
    .prepare(
      `INSERT INTO saved_routes (id, trip_id, type, name, origin_lat, origin_lng, dest_lat, dest_lng, waypoints, distance_m, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      id,
      input.trip_id ?? null,
      input.type,
      input.name ?? null,
      origin.lat,
      origin.lng,
      dest.lat,
      dest.lng,
      JSON.stringify(pts),
      input.distance_m ?? null,
      input.notes ?? null,
    );
  return getDb().prepare("SELECT * FROM saved_routes WHERE id = ?").get(id) as SavedRoute;
}

export function deleteRoute(id: string): void {
  getDb().prepare("DELETE FROM saved_routes WHERE id = ?").run(id);
}
