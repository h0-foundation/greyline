import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';
import { encrypt, decrypt } from '../crypto/encryption';
import { deriveKey } from '../crypto/key-derivation';
import { createVaultDoc, getVaultDocById, deleteVaultDoc, getAllVaultDocs } from '../db/repositories/vault';

const VAULT_DIR = resolve('data/vault');
const VERIFY_FILE = join(VAULT_DIR, '.verify');
const VERIFY_PLAINTEXT = 'GREYLINE_VAULT_OK';

function ensureVaultDir() {
  if (!existsSync(VAULT_DIR)) mkdirSync(VAULT_DIR, { recursive: true });
}

export function isVaultInitialized(): boolean {
  return existsSync(VERIFY_FILE);
}

export async function initializeVault(passphrase: string): Promise<void> {
  ensureVaultDir();
  const { key, salt } = await deriveKey(passphrase);
  const encrypted = encrypt(Buffer.from(VERIFY_PLAINTEXT), key);
  writeFileSync(VERIFY_FILE, Buffer.concat([salt, encrypted]));
}

export async function verifyPassphrase(passphrase: string): Promise<boolean> {
  if (!existsSync(VERIFY_FILE)) return false;
  try {
    const stored = readFileSync(VERIFY_FILE);
    const salt = stored.subarray(0, 32);
    const encryptedData = stored.subarray(32);
    const { key } = await deriveKey(passphrase, salt);
    const decrypted = decrypt(encryptedData, key);
    return decrypted.toString() === VERIFY_PLAINTEXT;
  } catch {
    return false;
  }
}

// Derive encryption key from passphrase. Salt is stored as first 32 bytes of each encrypted file.
export async function encryptAndStore(
  passphrase: string,
  fileBuffer: Buffer,
  metadata: { name: string; category: string; filename: string; mimeType: string }
): Promise<any> {
  ensureVaultDir();
  const { key, salt } = await deriveKey(passphrase);
  const encrypted = encrypt(fileBuffer, key);
  // Store as: [salt (32 bytes)] [encrypted data]
  const stored = Buffer.concat([salt, encrypted]);

  const docId = crypto.randomUUID();
  const encPath = join(VAULT_DIR, `${docId}.enc`);
  writeFileSync(encPath, stored);

  const doc = createVaultDoc({
    name: metadata.name,
    category: metadata.category,
    filename: metadata.filename,
    encrypted_path: encPath,
    mime_type: metadata.mimeType,
    file_size: fileBuffer.length
  });

  return doc;
}

export async function decryptAndRetrieve(docId: string, passphrase: string): Promise<{ buffer: Buffer; doc: any } | null> {
  const doc = getVaultDocById(docId) as any;
  if (!doc || !doc.encrypted_path) return null;

  if (!existsSync(doc.encrypted_path)) return null;

  const stored = readFileSync(doc.encrypted_path);
  const salt = stored.subarray(0, 32);
  const encryptedData = stored.subarray(32);

  const { key } = await deriveKey(passphrase, salt);
  const decrypted = decrypt(encryptedData, key);

  return { buffer: decrypted, doc };
}

export function removeDoc(docId: string): void {
  const doc = getVaultDocById(docId) as any;
  if (doc?.encrypted_path && existsSync(doc.encrypted_path)) {
    unlinkSync(doc.encrypted_path);
  }
  deleteVaultDoc(docId);
}

export function listDocs() {
  return getAllVaultDocs();
}
