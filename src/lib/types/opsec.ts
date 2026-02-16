// ---------------------------------------------------------------------------
// SecurityScore & CounterSurveillanceEntry types
// ---------------------------------------------------------------------------

export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Computed security score for a trip or destination.
 *
 * This is a derived type -- not stored directly in a single table --
 * but used throughout the UI to present aggregated risk data.
 */
export interface SecurityScore {
  /** Overall numeric score (0-100, higher = more risk). */
  overall: number;
  /** Individual dimension scores. */
  dimensions: {
    political_stability: number;
    crime: number;
    health: number;
    infrastructure: number;
    natural_disaster: number;
    cyber: number;
  };
  threat_level: ThreatLevel;
  summary: string;
  updated_at: string;
}

/** An entry in the counter-surveillance log. */
export interface CounterSurveillanceEntry {
  id: string;
  /** ISO-8601 timestamp of the observation. */
  timestamp: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  /** Physical description of the person observed. */
  person_desc: string | null;
  /** Description of any vehicle involved. */
  vehicle_desc: string | null;
  threat_level: ThreatLevel | null;
  /** Stored as JSON in the database; parsed into string[]. */
  tags: string[];
  /** Stored as JSON in the database; parsed into string[]. */
  linked_ids: string[];
}
