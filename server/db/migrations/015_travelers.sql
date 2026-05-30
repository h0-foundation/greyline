-- Multi-traveler roster: the people a trip organiser is responsible for
-- (duty of care). Local-only; nothing leaves the machine. A traveller may be
-- assigned to zero or more trips via trip_travelers.

CREATE TABLE IF NOT EXISTS travelers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,                       -- e.g. "Journalist", "Fixer", "Team lead"
  email TEXT,
  phone TEXT,
  emergency_contact TEXT,          -- name + number of next of kin
  blood_type TEXT,
  notes TEXT,
  -- Check-in state for live duty-of-care tracking.
  checkin_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (checkin_status IN ('ok','overdue','sos','unknown')),
  last_checkin TEXT,               -- ISO timestamp of the last check-in
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trip_travelers (
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  traveler_id TEXT NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_id, traveler_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_travelers_trip ON trip_travelers(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_travelers_traveler ON trip_travelers(traveler_id);
