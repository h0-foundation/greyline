-- Relax the checklists.type CHECK: the phased OPSEC model adds
-- pre-trip / during / post-trip types. Rebuild the table without the constraint
-- (SQLite can't drop a CHECK in place). Preserve rows, FKs, and indexes.
PRAGMA foreign_keys = OFF;

CREATE TABLE checklists_new (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  destination_id TEXT REFERENCES destinations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  items TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO checklists_new SELECT id, trip_id, destination_id, type, name, items, created_at, updated_at FROM checklists;
DROP TABLE checklists;
ALTER TABLE checklists_new RENAME TO checklists;

CREATE INDEX idx_checklists_trip ON checklists(trip_id);
CREATE INDEX idx_checklists_destination ON checklists(destination_id);

PRAGMA foreign_keys = ON;
