CREATE TABLE IF NOT EXISTS counter_surveillance_log (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  lat REAL,
  lng REAL,
  description TEXT,
  person_desc TEXT,
  vehicle_desc TEXT,
  threat_level TEXT NOT NULL DEFAULT 'low' CHECK(threat_level IN ('low','medium','high','critical')),
  tags TEXT DEFAULT '[]',
  linked_ids TEXT DEFAULT '[]'
);

CREATE INDEX idx_cs_log_timestamp ON counter_surveillance_log(timestamp);
CREATE INDEX idx_cs_log_threat ON counter_surveillance_log(threat_level);
