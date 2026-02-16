-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS api_toggles (
  api_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  use_tor INTEGER NOT NULL DEFAULT 0
);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('theme', '"dark"'),
  ('units', '"metric"'),
  ('default_map_region', '"world"'),
  ('sidebar_collapsed', 'false'),
  ('master_offline', 'false');

-- Insert default API toggles (all disabled by default for privacy)
INSERT OR IGNORE INTO api_toggles (api_id, enabled) VALUES
  ('open-meteo', 0),
  ('gdelt', 0),
  ('travel-advisory', 0),
  ('overpass', 0),
  ('exchange-rates', 0),
  ('nominatim', 0),
  ('adsb', 0),
  ('ip-api', 0);
