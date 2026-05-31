-- Optional per-connector API key (for the connectors that require one, e.g.
-- FIRMS/OpenAQ). Stored in the local single-user loopback DB like every other
-- setting; never returned to the client (the toggles API exposes only has_key).
-- All connectors stay OFF by default — a key alone does not enable a connector.
ALTER TABLE api_toggles ADD COLUMN api_key TEXT;
