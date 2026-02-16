import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { decryptAndRetrieve } from '$server/services/vault.js';

export const POST: RequestHandler = async ({ params, request }) => {
  const { passphrase } = await request.json();
  if (!passphrase) {
    return json({ error: 'Passphrase required' }, { status: 400 });
  }

  try {
    const result = await decryptAndRetrieve(params.id, passphrase);
    if (!result) {
      return json({ error: 'Document not found' }, { status: 404 });
    }

    return new Response(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': result.doc.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${result.doc.filename || 'download'}"`,
        'Content-Length': result.buffer.length.toString()
      }
    });
  } catch (err) {
    return json({ error: 'Decryption failed — wrong passphrase?' }, { status: 403 });
  }
};
