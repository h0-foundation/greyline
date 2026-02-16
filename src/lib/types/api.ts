// ---------------------------------------------------------------------------
// ApiToggle, ApiCacheEntry & OfflineBundle types
// ---------------------------------------------------------------------------

export type BundleType =
  | 'map'
  | 'country'
  | 'cultural'
  | 'currency'
  | 'surveillance'
  | 'transit';

/** Per-API toggle stored in the settings database. */
export interface ApiToggle {
  api_id: string;
  enabled: boolean;
  use_tor: boolean;
}

/** A cached API response. */
export interface ApiCacheEntry {
  cache_key: string;
  api_id: string | null;
  /** The raw JSON payload stored as a string; parse as needed. */
  data: string | null;
  /** ISO-8601 timestamp when the entry was cached. */
  cached_at: string | null;
  /** ISO-8601 timestamp when the entry expires. */
  expires_at: string | null;
}

/** A downloaded offline data bundle. */
export interface OfflineBundle {
  id: string;
  type: BundleType | null;
  /** Region or country code the bundle covers. */
  region: string | null;
  /** Local filesystem path to the bundle. */
  path: string | null;
  /** Size in bytes. */
  size: number | null;
  /** ISO-8601 timestamp when the bundle was downloaded. */
  downloaded_at: string | null;
  /** Integrity checksum (e.g. SHA-256 hex). */
  checksum: string | null;
}

/** Generic application setting (key-value pair). */
export interface Setting {
  key: string;
  value: string | null;
  updated_at: string | null;
}
