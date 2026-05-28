-- Per-country dossier data: CPI / RSF / visa-free counts and other comparable
-- indices; multi-source travel advisories; CIA World Factbook JSON. All three
-- are reads from bundled/cached data — nothing leaves this machine at runtime.

-- Comparable country indices (per-year + latest snapshot kept).
CREATE TABLE IF NOT EXISTS country_indices (
  iso2 TEXT PRIMARY KEY,
  cpi_score INTEGER,                   -- Transparency Intl CPI (0..100)
  cpi_year INTEGER,
  rsf_score REAL,                      -- RSF Press Freedom score (0..100)
  rsf_rank INTEGER,                    -- RSF rank within the year's edition
  rsf_year INTEGER,
  fsi_score REAL,                      -- Fragile States Index total (higher = more fragile)
  fsi_year INTEGER,
  gpi_score REAL,                      -- Global Peace Index (lower = more peaceful)
  gpi_rank INTEGER,
  gpi_year INTEGER,
  visa_free_count INTEGER,             -- # destinations this passport reaches without prior visa
  visa_free_year INTEGER,
  source_urls TEXT DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Multi-source travel advisories. Each row is one government source's current
-- snapshot for one country.
CREATE TABLE IF NOT EXISTS country_advisories (
  iso2 TEXT NOT NULL,
  source TEXT NOT NULL,                -- us_state | uk_fcdo | au_dfat | ca_gac | de_aa | fr_diplo | nz_safe
  level INTEGER,                       -- normalized 1..4 (1=lowest concern)
  level_label TEXT,                    -- source-native label (e.g. "Reconsider travel")
  summary TEXT,                        -- 1-3 sentences
  url TEXT,                            -- deep link back to source
  updated TEXT,                        -- source's published-at, ISO 8601
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (iso2, source)
);
CREATE INDEX IF NOT EXISTS idx_advisories_iso ON country_advisories(iso2);
CREATE INDEX IF NOT EXISTS idx_advisories_src ON country_advisories(source);

-- CIA World Factbook snapshots (one row per country, ~10-20KB JSON each).
-- Public domain dataset; mirrored at factbook/factbook.json on GitHub.
CREATE TABLE IF NOT EXISTS country_factbook (
  iso2 TEXT PRIMARY KEY,
  gec_code TEXT,                       -- factbook's GEC/FIPS country code
  data TEXT NOT NULL,                  -- full JSON blob
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
