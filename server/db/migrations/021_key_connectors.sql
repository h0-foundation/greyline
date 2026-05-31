-- Toggle rows for the key-required live map connectors. OFF by default, and the
-- gateway additionally refuses them until a personal api_key is set (so a key
-- alone never enables a connector). Keys are entered in Settings → Connections.
INSERT OR IGNORE INTO api_toggles (api_id, enabled) VALUES
  ('nasa-firms', 0),  -- NASA FIRMS active-fire detections (MAP_KEY)
  ('openaq', 0);      -- OpenAQ air-quality stations (X-API-Key)
