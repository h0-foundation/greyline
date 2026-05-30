import argon2 from 'argon2';
import { randomBytes } from 'crypto';

const SALT_LENGTH = 32;

/**
 * Argon2id parameter sets, versioned.
 *
 * The vault derives keys with `raw: true`, so the parameters are NOT embedded in
 * the output — a key only re-derives if the SAME numbers are used. That makes the
 * numbers a compatibility contract: NEVER edit an existing version's values (it
 * would make every vault keyed under them undecryptable). To strengthen the KDF,
 * ADD a new version, point CURRENT_KDF_VERSION at it, and let readers fall back
 * through the older versions (see `deriveAndDecrypt` in the vault service). New
 * data is written with the strong params; existing data still opens.
 *
 * parallelism is fixed per version (never derived from the host's core count) so
 * a vault written on one machine re-derives identically on another.
 */
export const KDF_PARAMS = {
  1: { memoryCost: 65536, timeCost: 3, parallelism: 1 },   // original — already >= OWASP minimum
  2: { memoryCost: 131072, timeCost: 4, parallelism: 2 },  // hardened default (128 MiB)
} as const;

export type KdfVersion = keyof typeof KDF_PARAMS;

export const CURRENT_KDF_VERSION: KdfVersion = 2;

// Newest-first — the order readers try when opening an existing blob.
export const KDF_VERSIONS: KdfVersion[] = [2, 1];

export async function deriveKey(
  passphrase: string,
  salt?: Buffer,
  version: KdfVersion = CURRENT_KDF_VERSION,
): Promise<{ key: Buffer; salt: Buffer }> {
  const useSalt = salt ?? randomBytes(SALT_LENGTH);
  const p = KDF_PARAMS[version];
  const hash = await argon2.hash(passphrase, {
    type: argon2.argon2id,
    memoryCost: p.memoryCost,
    timeCost: p.timeCost,
    parallelism: p.parallelism,
    salt: useSalt,
    raw: true,
    hashLength: 32,
  });
  return { key: hash, salt: useSalt };
}
