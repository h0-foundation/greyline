-- GeoNames offline cities gazetteer (cities5000.txt — places with 5000+ population,
-- CC-BY 4.0). Mirrors the airports table: an offline place→coords resolver that
-- needs no network. Bundled at build time (scripts/build-data.ts) and committed
-- as data/bundles/data/cities5000.txt.gz so CI seeds it air-gapped.
CREATE TABLE IF NOT EXISTS geonames_cities (
  geonameid INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  asciiname TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  country_code TEXT,        -- ISO2
  admin1_code TEXT,         -- state/province code
  population INTEGER NOT NULL DEFAULT 0,
  timezone TEXT
);
CREATE INDEX IF NOT EXISTS idx_geonames_country ON geonames_cities(country_code);
CREATE INDEX IF NOT EXISTS idx_geonames_name ON geonames_cities(asciiname);
CREATE INDEX IF NOT EXISTS idx_geonames_geo ON geonames_cities(lat, lng);
