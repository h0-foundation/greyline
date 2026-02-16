// ---------------------------------------------------------------------------
// VaultDocument types
// ---------------------------------------------------------------------------

export type VaultCategory =
  | 'passport'
  | 'visa'
  | 'insurance'
  | 'medical'
  | 'financial'
  | 'other';

export interface VaultDocument {
  id: string;
  name: string;
  category: VaultCategory | null;
  /** Original filename as uploaded by the user. */
  filename: string | null;
  /** Path to the encrypted file on disk. */
  encrypted_path: string | null;
  mime_type: string | null;
  /** File size in bytes. */
  file_size: number | null;
  /** Stored as JSON in the database; parsed into string[]. */
  tags: string[];
  notes: string | null;
  created_at: string | null;
}
