CREATE TABLE IF NOT EXISTS country_profiles (
  country_code TEXT PRIMARY KEY,
  rest_countries TEXT,
  cia_factbook TEXT,
  cultural TEXT,
  advisory TEXT,
  financial TEXT,
  comms TEXT,
  photography TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS api_cache (
  cache_key TEXT PRIMARY KEY,
  api_id TEXT NOT NULL,
  data TEXT NOT NULL,
  cached_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS offline_bundles (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('map','country','cultural','currency','surveillance','transit')),
  region TEXT,
  path TEXT NOT NULL,
  size INTEGER,
  downloaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  checksum TEXT
);

CREATE INDEX idx_cache_api ON api_cache(api_id);
CREATE INDEX idx_cache_expires ON api_cache(expires_at);
CREATE INDEX idx_bundles_type ON offline_bundles(type);
