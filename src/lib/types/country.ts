// ---------------------------------------------------------------------------
// CountryProfile & Advisory types
// ---------------------------------------------------------------------------

/** Travel advisory level (standard 1-4 scale used by many governments). */
export type AdvisoryLevel = 1 | 2 | 3 | 4;

/** Structured advisory information embedded inside a CountryProfile. */
export interface Advisory {
  level: AdvisoryLevel;
  source: string;
  title: string;
  description: string;
  updated_at: string;
  url?: string;
}

/** Cultural norms and etiquette notes for a country. */
export interface CulturalInfo {
  greetings?: string;
  dress_code?: string;
  taboos?: string[];
  tipping?: string;
  notes?: string;
}

/** Financial / currency information. */
export interface FinancialInfo {
  currency_code: string;
  currency_name: string;
  exchange_rate_usd?: number;
  atm_availability?: string;
  card_acceptance?: string;
  notes?: string;
}

/** Communications landscape for a country. */
export interface CommsInfo {
  country_dialing_code: string;
  emergency_number: string;
  internet_freedom_score?: number;
  vpn_legality?: string;
  censored_services?: string[];
  local_sim_availability?: string;
  notes?: string;
}

/** Photography restrictions and guidance. */
export interface PhotographyInfo {
  general_policy?: string;
  restricted_subjects?: string[];
  drone_legality?: string;
  notes?: string;
}

// ---- Core entity ----------------------------------------------------------

/**
 * Aggregated country profile.
 *
 * Several columns are stored as JSON blobs in SQLite; the typed interfaces
 * above represent their parsed form.
 */
export interface CountryProfile {
  country_code: string;
  /** REST Countries API payload (JSON). */
  rest_countries: Record<string, unknown> | null;
  /** CIA World Factbook extract (JSON). */
  cia_factbook: Record<string, unknown> | null;
  /** Parsed cultural information (JSON). */
  cultural: CulturalInfo | null;
  /** Parsed travel advisory (JSON). */
  advisory: Advisory | null;
  /** Parsed financial information (JSON). */
  financial: FinancialInfo | null;
  /** Parsed comms information (JSON). */
  comms: CommsInfo | null;
  /** Parsed photography guidance (JSON). */
  photography: PhotographyInfo | null;
  updated_at: string | null;
}
