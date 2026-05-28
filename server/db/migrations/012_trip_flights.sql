-- Flights belonging to a trip. Optional — you can plan/log a trip without
-- attaching tickets, but adding them lights up layover and transit analysis.
-- `status` lets us hold both *planned* future flights and *flown* past flights
-- so the briefing's tense (will / did) stays accurate.

CREATE TABLE IF NOT EXISTS trip_flights (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  carrier_iata TEXT,                              -- e.g. "LH"
  flight_number TEXT,                             -- e.g. "441"
  dep_iata TEXT,                                  -- e.g. "JFK"
  dep_time TEXT,                                  -- ISO 8601 local
  arr_iata TEXT,                                  -- e.g. "FRA"
  arr_time TEXT,                                  -- ISO 8601 local
  seat TEXT,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK(status IN ('planned','booked','flown','cancelled')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trip_flights_trip ON trip_flights(trip_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_trip_flights_dep ON trip_flights(dep_iata);
CREATE INDEX IF NOT EXISTS idx_trip_flights_arr ON trip_flights(arr_iata);
