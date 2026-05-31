-- Two fully-offline intelligence datasets, bundled at build time like airports
-- and the gazetteer. Neither makes any runtime network request, so neither needs
-- an api_toggles entry — they are always available air-gapped.

-- OFAC sanctions (SDN + Consolidated lists, US Treasury — public domain US Gov
-- work). On-device name screening: does a person/entity appear on a US sanctions
-- list? Primary names live in sanctions_entries; every searchable string (primary
-- + a.k.a. aliases) lives in sanctions_names so a query can match either.
CREATE TABLE IF NOT EXISTS sanctions_entries (
  list TEXT NOT NULL,            -- 'SDN' | 'Consolidated'
  ent_num INTEGER NOT NULL,      -- OFAC entity number (unique within a list)
  name TEXT NOT NULL,            -- primary listed name
  sdn_type TEXT,                 -- Individual / Entity / Vessel / Aircraft / NULL
  program TEXT,                  -- sanctions program(s), e.g. "IRAN; SDGT"
  remarks TEXT,
  PRIMARY KEY (list, ent_num)
);
CREATE TABLE IF NOT EXISTS sanctions_names (
  list TEXT NOT NULL,
  ent_num INTEGER NOT NULL,
  name TEXT NOT NULL,            -- primary name or an a.k.a. alias
  is_primary INTEGER NOT NULL DEFAULT 0
);
-- LIKE is ASCII-case-insensitive in SQLite, so this index backs name screening.
CREATE INDEX IF NOT EXISTS idx_sanctions_names ON sanctions_names(name);
CREATE INDEX IF NOT EXISTS idx_sanctions_names_ent ON sanctions_names(list, ent_num);

-- UCDP Georeferenced Event Dataset (Uppsala Conflict Data Program, CC-BY-4.0),
-- reduced at build time to a compact, committable bundle: the deadliest recent
-- georeferenced events (for the map's armed-conflict layer) plus per-country-year
-- fatality totals (for the country dossier trend). The 350MB raw GED never enters
-- the repo — only this derived slice.
CREATE TABLE IF NOT EXISTS ucdp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  year INTEGER NOT NULL,
  deaths INTEGER NOT NULL DEFAULT 0,    -- UCDP "best" estimate
  type_of_violence INTEGER,             -- 1 state-based, 2 non-state, 3 one-sided
  country TEXT,
  country_id INTEGER,                   -- Gleditsch-Ward number
  conflict_name TEXT,
  date_start TEXT
);
CREATE INDEX IF NOT EXISTS idx_ucdp_events_geo ON ucdp_events(lat, lng);
CREATE INDEX IF NOT EXISTS idx_ucdp_events_country ON ucdp_events(country);

CREATE TABLE IF NOT EXISTS ucdp_country_year (
  country TEXT NOT NULL,
  year INTEGER NOT NULL,
  deaths INTEGER NOT NULL DEFAULT 0,
  events INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (country, year)
);
