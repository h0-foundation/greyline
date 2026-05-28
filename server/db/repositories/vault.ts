import { getDb } from '../index';
import { v4 as uuid } from 'uuid';

export function getAllVaultDocs() {
  return getDb().prepare('SELECT * FROM vault_docs ORDER BY created_at DESC').all();
}

export function getVaultDocById(id: string) {
  return getDb().prepare('SELECT * FROM vault_docs WHERE id = ?').get(id);
}

export function createVaultDoc(input: { name: string; category: string; filename: string; encrypted_path: string; mime_type: string; file_size: number; tags?: string; notes?: string }) {
  const id = uuid();
  const db = getDb();
  db.prepare(
    "INSERT INTO vault_docs (id, name, category, filename, encrypted_path, mime_type, file_size, tags, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
  ).run(id, input.name, input.category, input.filename, input.encrypted_path, input.mime_type, input.file_size, input.tags ?? '[]', input.notes ?? null);
  return getVaultDocById(id);
}

export function deleteVaultDoc(id: string) {
  getDb().prepare('DELETE FROM vault_docs WHERE id = ?').run(id);
}
