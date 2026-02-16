import argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';

const SALT_LENGTH = 32;

export async function deriveKey(passphrase: string, salt?: Buffer): Promise<{ key: Buffer; salt: Buffer }> {
  const useSalt = salt ?? randomBytes(SALT_LENGTH);
  const hash = await argon2.hash(passphrase, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    salt: useSalt,
    raw: true,
    hashLength: 32
  });
  return { key: hash, salt: useSalt };
}

export function hashPassphrase(passphrase: string): string {
  return createHash('sha256').update(passphrase).digest('hex').slice(0, 16);
}
