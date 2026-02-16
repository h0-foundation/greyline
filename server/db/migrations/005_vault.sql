CREATE TABLE IF NOT EXISTS vault_docs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK(category IN ('passport','visa','insurance','medical','financial','other')),
  filename TEXT,
  encrypted_path TEXT,
  mime_type TEXT,
  file_size INTEGER,
  tags TEXT DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
