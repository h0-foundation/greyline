import {
  isVaultInitialized,
  listDocs,
  verifyPassphrase,
  encryptAndStore,
} from "$server/services/vault";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// Status + document metadata. Never returns file contents.
export async function GET() {
  return Response.json({ initialized: isVaultInitialized(), docs: listDocs() });
}

// Upload + encrypt. Requires the passphrase (verified, never stored).
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const passphrase = String(form.get("passphrase") || "");
    const file = form.get("file");
    if (!passphrase) return Response.json({ ok: false, error: "Passphrase required" }, { status: 400 });
    if (!(file instanceof File)) return Response.json({ ok: false, error: "No file" }, { status: 400 });
    if (!(await verifyPassphrase(passphrase))) {
      return Response.json({ ok: false, error: "Wrong passphrase" }, { status: 401 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await encryptAndStore(passphrase, buffer, {
      name: String(form.get("name") || file.name),
      category: String(form.get("category") || "other"),
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
    });
    return Response.json({ ok: true, doc }, { status: 201 });
  } catch (err) {
    return fail("POST /api/vault", err, "Could not access the vault.");
  }
}
