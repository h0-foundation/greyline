import {
  isVaultInitialized,
  initializeVault,
  verifyPassphrase,
} from "$server/services/vault";
import { rateLimit, tooManyRequests } from "$server/http/rate-limit";

export const dynamic = "force-dynamic";

// First call initializes the vault with the chosen passphrase; later calls verify.
export async function POST(req: Request) {
  // Throttle passphrase attempts so a local process can't brute-force the vault
  // at full speed (the Argon2id KDF already makes each attempt costly).
  const limit = rateLimit("vault:unlock", 10, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);
  try {
    const { passphrase } = await req.json();
    if (!passphrase || typeof passphrase !== "string" || passphrase.length < 8) {
      return Response.json({ ok: false, error: "Passphrase must be at least 8 characters" }, { status: 400 });
    }
    if (!isVaultInitialized()) {
      await initializeVault(passphrase);
      return Response.json({ ok: true, initialized: true, created: true });
    }
    const valid = await verifyPassphrase(passphrase);
    if (!valid) return Response.json({ ok: false, error: "Wrong passphrase" }, { status: 401 });
    return Response.json({ ok: true, initialized: true });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
