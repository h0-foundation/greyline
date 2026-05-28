-- Relax trips.status CHECK to the product vocabulary (planning → active → wrapped)
-- plus legacy values. SQLite can't drop a CHECK in place; rebuild the table.
-- foreign_keys=OFF so dropping the parent doesn't cascade-delete destinations/
-- checklists/routes/rally — their FK-by-name re-resolves after the rename.
PRAGMA foreign_keys = OFF;

CREATE TABLE trips_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK(status IN ('planning','active','wrapped','completed','archived')),
  start_date TEXT,
  end_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO trips_new SELECT id, name, status, start_date, end_date, notes, created_at, updated_at FROM trips;
DROP TABLE trips;
ALTER TABLE trips_new RENAME TO trips;

PRAGMA foreign_keys = ON;
