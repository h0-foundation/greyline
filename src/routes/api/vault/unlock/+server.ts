import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { isVaultInitialized, initializeVault, verifyPassphrase } from '$server/services/vault.js';

export const POST: RequestHandler = async ({ request }) => {
  const { passphrase } = await request.json();
  if (!passphrase) {
    return json({ error: 'Passphrase required' }, { status: 400 });
  }

  const initialized = isVaultInitialized();

  if (!initialized) {
    // First-time setup — initialize vault with this passphrase
    await initializeVault(passphrase);
    return json({ ok: true, setup: true });
  }

  // Verify against stored passphrase
  const valid = await verifyPassphrase(passphrase);
  if (!valid) {
    return json({ ok: false, error: 'Invalid passphrase' }, { status: 401 });
  }

  return json({ ok: true });
};

export const GET: RequestHandler = async () => {
  return json({ initialized: isVaultInitialized() });
};
