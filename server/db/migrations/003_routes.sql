CREATE TABLE IF NOT EXISTS saved_routes (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('sdr','extraction','variation','normal')),
  name TEXT,
  origin_lat REAL,
  origin_lng REAL,
  dest_lat REAL,
  dest_lng REAL,
  waypoints TEXT DEFAULT '[]',
  geometry TEXT,
  distance_m REAL,
  duration_s REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rally_points (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  time_start TEXT,
  time_end TEXT,
  fallback_id TEXT REFERENCES rally_points(id),
  instructions TEXT
);

CREATE INDEX idx_routes_trip ON saved_routes(trip_id);
CREATE INDEX idx_rally_trip ON rally_points(trip_id);
