-- Investigation case-file + chain-of-custody (M4 journalism pack).
-- A case groups evidence items (notes, URLs, observations, and — later — files).
-- Every item is SHA-256 hashed at intake as an integrity anchor; case_events is
-- an append-only audit trail (who-less here, but timestamped what/when) so the
-- provenance of the file can be demonstrated on hand-off.

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS case_items (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('note','url','observation','file')),
  title TEXT,
  body TEXT,                 -- note text / URL / observation text
  file_path TEXT,            -- for kind='file' (stored under data/cases/)
  mime_type TEXT,
  file_size INTEGER,
  sha256 TEXT NOT NULL,      -- integrity anchor computed at intake
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_case_items_case ON case_items(case_id);

-- Append-only chain-of-custody log. Rows are never updated, only inserted.
CREATE TABLE IF NOT EXISTS case_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  item_id TEXT,              -- the item this event concerns, when applicable
  type TEXT NOT NULL,        -- case_created | item_added | item_removed | status_changed | note
  detail TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_case_events_case ON case_events(case_id);
