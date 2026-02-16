// ---------------------------------------------------------------------------
// Trip, Destination & Checklist types
// ---------------------------------------------------------------------------

export type TripStatus = 'planning' | 'active' | 'completed' | 'archived';

export type ChecklistType =
  | 'hotel-security'
  | 'border-crossing'
  | 'digital-hygiene'
  | 'packing'
  | 'custom';

/** A single item inside a checklist. */
export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  notes?: string;
}

// ---- Core entities --------------------------------------------------------

export interface Trip {
  id: string;
  name: string;
  status: TripStatus;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Destination {
  id: string;
  trip_id: string;
  country_code: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  arrival_date: string | null;
  departure_date: string | null;
  sort_order: number | null;
  notes: string | null;
  risk_level: number | null;
}

export interface Checklist {
  id: string;
  trip_id: string | null;
  destination_id: string | null;
  type: ChecklistType | null;
  name: string;
  /** Stored as JSON in the database; parsed into ChecklistItem[]. */
  items: ChecklistItem[];
  created_at: string | null;
  updated_at: string | null;
}
