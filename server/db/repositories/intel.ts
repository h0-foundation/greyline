import { getDb } from '../index';

export interface CountryIntel {
  iso2: string;
  freedom_score: number | null;
  freedom_status: string | null;
  advisory_level: number | null;
  advisory_note: string | null;
  vpn_legality: string | null;
  vpn_note: string | null;
  decryption_compulsion: string | null;
  decryption_note: string | null;
  sim_registration: string | null;
  surveillance_note: string | null;
  gdpr_adequacy: number;
  lgbtq_legal_risk: string | null;
  photography_note: string | null;
  apis_pnr_note: string | null;
  biometric_entry_note: string | null;
  source_urls: string;
  updated_at: string;
}

export interface CountryPractical {
  iso2: string;
  emergency_numbers: string;
  plug_types: string | null;
  voltage: string | null;
  frequency: string | null;
  driving_side: string | null;
  idp_required: number;
  cash_declaration: string | null;
  updated_at: string;
}

export function getCountryIntel(iso2: string): CountryIntel | undefined {
  return getDb().prepare('SELECT * FROM country_intel WHERE iso2 = ?').get(iso2.toUpperCase()) as
    | CountryIntel
    | undefined;
}

export function getCountryPractical(iso2: string): CountryPractical | undefined {
  return getDb().prepare('SELECT * FROM country_practical WHERE iso2 = ?').get(iso2.toUpperCase()) as
    | CountryPractical
    | undefined;
}

/** ISO2 codes that have a curated intel row (used to badge the Countries list). */
export function getIntelCoverage(): Set<string> {
  const rows = getDb().prepare('SELECT iso2 FROM country_intel').all() as { iso2: string }[];
  return new Set(rows.map((r) => r.iso2));
}

export interface VisaRow {
  passport_iso2: string;
  dest_iso2: string;
  requirement: string;
  detail: string | null;
}

export function getVisaRequirement(passport: string, dest: string): VisaRow | undefined {
  return getDb()
    .prepare('SELECT * FROM visas WHERE passport_iso2 = ? AND dest_iso2 = ?')
    .get(passport.toUpperCase(), dest.toUpperCase()) as VisaRow | undefined;
}

export function getVisasForPassport(passport: string): VisaRow[] {
  return getDb()
    .prepare('SELECT * FROM visas WHERE passport_iso2 = ? ORDER BY dest_iso2')
    .all(passport.toUpperCase()) as VisaRow[];
}

/** Distinct passport codes present in the matrix (for the visa-checker picker). */
export function getVisaPassports(): string[] {
  const rows = getDb()
    .prepare('SELECT DISTINCT passport_iso2 FROM visas ORDER BY passport_iso2')
    .all() as { passport_iso2: string }[];
  return rows.map((r) => r.passport_iso2);
}

export function getDataSources() {
  return getDb()
    .prepare('SELECT * FROM data_sources ORDER BY category, name')
    .all() as Array<{ id: string; name: string; license: string; url: string; category: string; row_count: number; version: string | null; downloaded_at: string }>;
}
