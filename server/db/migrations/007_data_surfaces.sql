-- Phase A: new offline data surfaces (airports, visas, country intel/practical),
-- threat models, incident log, and a data-source registry for the Attributions page.

-- Airports (OurAirports, public domain)
CREATE TABLE IF NOT EXISTS airports (
  ident TEXT PRIMARY KEY,            -- ICAO-ish unique identifier
  type TEXT,                          -- large_airport | medium_airport | small_airport | heliport | ...
  name TEXT NOT NULL,
  lat REAL,
  lng REAL,
  elevation_ft INTEGER,
  iso_country TEXT,                   -- ISO2
  iso_region TEXT,
  municipality TEXT,
  scheduled_service INTEGER NOT NULL DEFAULT 0,
  iata_code TEXT,
  icao_code TEXT
);
CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(iso_country);
CREATE INDEX IF NOT EXISTS idx_airports_iata ON airports(iata_code);
CREATE INDEX IF NOT EXISTS idx_airports_type ON airports(type);

-- Visa requirement matrix (ilyankou/passport-index-dataset, MIT)
CREATE TABLE IF NOT EXISTS visas (
  passport_iso2 TEXT NOT NULL,
  dest_iso2 TEXT NOT NULL,
  requirement TEXT NOT NULL,          -- visa_free | visa_on_arrival | e_visa | eta | visa_required | no_admission | home
  detail TEXT,                        -- e.g. "90" (days) or original cell value
  PRIMARY KEY (passport_iso2, dest_iso2)
);
CREATE INDEX IF NOT EXISTS idx_visas_passport ON visas(passport_iso2);

-- Curated privacy/legal posture per country (sourced + dated). The differentiator.
CREATE TABLE IF NOT EXISTS country_intel (
  iso2 TEXT PRIMARY KEY,
  freedom_score INTEGER,              -- Freedom in the World 0-100
  freedom_status TEXT,                -- Free | Partly Free | Not Free
  advisory_level INTEGER,             -- US State Dept 1-4
  advisory_note TEXT,
  vpn_legality TEXT,                  -- legal | restricted | illegal
  vpn_note TEXT,
  decryption_compulsion TEXT,         -- none | possible | yes
  decryption_note TEXT,
  sim_registration TEXT,              -- none | required | biometric
  surveillance_note TEXT,
  gdpr_adequacy INTEGER NOT NULL DEFAULT 0,
  lgbtq_legal_risk TEXT,              -- low | moderate | high | severe
  photography_note TEXT,
  apis_pnr_note TEXT,
  biometric_entry_note TEXT,
  source_urls TEXT DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Practical arrival data per country (emergency numbers, plugs, voltage, driving, customs)
CREATE TABLE IF NOT EXISTS country_practical (
  iso2 TEXT PRIMARY KEY,
  emergency_numbers TEXT DEFAULT '{}',-- JSON { police, ambulance, fire, general }
  plug_types TEXT,                    -- e.g. "A,B"
  voltage TEXT,                       -- e.g. "120V"
  frequency TEXT,                     -- e.g. "60Hz"
  driving_side TEXT,                  -- left | right
  idp_required INTEGER NOT NULL DEFAULT 0,
  cash_declaration TEXT,              -- e.g. "USD 10000"
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Threat-model wizard answers (EFF 5 questions) → computed dial level
CREATE TABLE IF NOT EXISTS threat_models (
  id TEXT PRIMARY KEY,
  trip_id TEXT,
  destination_id TEXT,
  assets TEXT DEFAULT '[]',
  adversaries TEXT DEFAULT '[]',
  capability TEXT,                    -- low | medium | high | state
  consequence TEXT,                   -- low | medium | high | severe
  effort TEXT,                        -- low | medium | high
  computed_level TEXT,                -- routine | elevated | high | extreme
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_threat_trip ON threat_models(trip_id);

-- General incident log (trip-scoped events; distinct from counter_surveillance_log)
CREATE TABLE IF NOT EXISTS incident_log (
  id TEXT PRIMARY KEY,
  trip_id TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  type TEXT,                          -- border | surveillance | theft | detention | other
  severity TEXT NOT NULL DEFAULT 'low' CHECK(severity IN ('low','medium','high','critical')),
  title TEXT,
  description TEXT,
  lat REAL,
  lng REAL,
  tags TEXT DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_incident_trip ON incident_log(trip_id);

-- Data-source registry powering the Attributions page
CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  license TEXT NOT NULL,
  url TEXT,
  category TEXT,
  row_count INTEGER,
  version TEXT,
  downloaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
