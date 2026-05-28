import { decryptAndRetrieve, removeDoc } from "$server/services/vault";

export const dynamic = "force-dynamic";

// Decrypt + return the file bytes (base64). Requires the passphrase; wrong
// passphrase fails the GCM auth tag → 403. Content never persists decrypted.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { passphrase } = await req.json();
    if (!passphrase) return Response.json({ ok: false, error: "Passphrase required" }, { status: 400 });
    const result = await decryptAndRetrieve(id, passphrase);
    if (!result) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    return Response.json({
      ok: true,
      filename: result.doc.filename,
      mimeType: result.doc.mime_type,
      data: result.buffer.toString("base64"),
    });
  } catch {
    // decrypt() throws on auth failure (wrong passphrase / tampered file)
    return Response.json({ ok: false, error: "Could not decrypt — wrong passphrase?" }, { status: 403 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  removeDoc(id);
  return Response.json({ ok: true });
}
