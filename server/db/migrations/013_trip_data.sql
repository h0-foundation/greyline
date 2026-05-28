-- Bundled, citable templates for trip planning. All ship in the repo and seed
-- offline via `pnpm build:trip-data`. Auto-generated per-trip checklists come
-- from joining these against the trip's destinations, flights, and threat tier.

-- Packing templates — clothing, gear, tech, opsec, docs, health, ground.
-- Generators filter by climate_tags (cold/temperate/hot/humid/cold-night),
-- activity_tags (urban/business/hike/beach/winter), and threat tier.
-- iso2 is non-null for country-specific items (e.g. "modesty layer for UAE").
CREATE TABLE IF NOT EXISTS packing_templates (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,                     -- documents | money | electronics | opsec | clothing | health | ground | specialty
  label TEXT NOT NULL,
  description TEXT,
  climate_tags TEXT NOT NULL DEFAULT '[]',    -- JSON: ["cold","cold-night","temperate","hot","humid","rain"]
  activity_tags TEXT NOT NULL DEFAULT '[]',   -- JSON: ["urban","business","hike","beach","winter","everyday"]
  threat_tier_min INTEGER NOT NULL DEFAULT 0, -- 0..3 (routine..extreme), 0 = always shown
  iso2 TEXT,                                  -- non-null for country-specific
  optional INTEGER NOT NULL DEFAULT 0,        -- 1 = "consider", 0 = "should pack"
  source_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_packing_category ON packing_templates(category);
CREATE INDEX IF NOT EXISTS idx_packing_iso ON packing_templates(iso2);

-- Airline carry-on / checked / liquids / lithium rules.
-- One row per IATA carrier code; values normalised to cm + kg + ml + Wh.
CREATE TABLE IF NOT EXISTS airline_rules (
  carrier_iata TEXT PRIMARY KEY,
  carrier_name TEXT NOT NULL,
  alliance TEXT,                              -- star | oneworld | skyteam | none
  cabin_l_cm INTEGER,                         -- carry-on length
  cabin_w_cm INTEGER,                         -- carry-on width
  cabin_h_cm INTEGER,                         -- carry-on height
  cabin_weight_kg REAL,                       -- carry-on weight cap (null = "no cap published")
  personal_l_cm INTEGER,                      -- personal item length
  personal_w_cm INTEGER,
  personal_h_cm INTEGER,
  checked_weight_kg REAL,                     -- per-bag checked weight (Economy default)
  checked_dim_total_cm INTEGER,               -- L+W+H total
  liquids_ml INTEGER NOT NULL DEFAULT 100,    -- TSA/EU/UK rule
  lithium_wh_installed_max INTEGER,           -- in-device Wh
  lithium_wh_spare_max INTEGER,               -- spare/loose Wh
  lithium_spare_qty_max INTEGER,              -- # spare batteries allowed
  notes TEXT,
  source_url TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- OPSEC items moved into the DB so they can be filtered/seeded/edited without
-- a code change. lib/opsec.ts is still the canonical seed source.
CREATE TABLE IF NOT EXISTS opsec_templates (
  id TEXT PRIMARY KEY,
  phase TEXT NOT NULL,                        -- pre-trip | border | during | post-trip
  category TEXT,                              -- device | identity | comms | physical | tradecraft
  threat_tier_min INTEGER NOT NULL DEFAULT 0, -- 0..3
  label TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_opsec_phase ON opsec_templates(phase);

-- Document checklist templates. Two kinds:
--   universal — always shown (passport validity, insurance, …)
--   country  — appears when iso2 is on the trip (e.g. yellow-fever for KE/UG)
CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('universal','country','transit')),
  iso2 TEXT,                                  -- non-null for country/transit
  category TEXT NOT NULL,                     -- visa | health | driving | insurance | proof_of_funds | customs | other
  label TEXT NOT NULL,
  description TEXT,
  when_required TEXT,                         -- e.g. "Stay > 90 days" or "Within 10 days of arrival"
  fee TEXT,                                   -- e.g. "EUR 7"
  processing TEXT,                            -- e.g. "Up to 14 days"
  source_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_doc_kind ON document_templates(kind, iso2);
