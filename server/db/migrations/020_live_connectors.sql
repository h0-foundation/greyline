-- Toggle rows for the new live (network) map connectors. OFF by default like
-- every connector — Greyline is offline-first; nothing fetches until enabled.
INSERT OR IGNORE INTO api_toggles (api_id, enabled) VALUES
  ('emsc', 0),        -- EMSC European/Mediterranean seismic feed
  ('nws-alerts', 0);  -- US National Weather Service active alerts
