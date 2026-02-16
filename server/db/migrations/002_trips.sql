CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning','active','completed','archived')),
  start_date TEXT,
  end_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS destinations (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  country_code TEXT,
  city TEXT,
  lat REAL,
  lng REAL,
  arrival_date TEXT,
  departure_date TEXT,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  risk_level REAL
);

CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  destination_id TEXT REFERENCES destinations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('hotel-security','border-crossing','digital-hygiene','packing','custom')),
  name TEXT NOT NULL,
  items TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_destinations_trip ON destinations(trip_id);
CREATE INDEX idx_checklists_trip ON checklists(trip_id);
CREATE INDEX idx_checklists_destination ON checklists(destination_id);
