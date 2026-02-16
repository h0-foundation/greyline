import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { encryptAndStore, decryptAndRetrieve, removeDoc, listDocs } from '$server/services/vault.js';

export const GET: RequestHandler = async () => {
  const docs = listDocs();
  return json(docs);
};

export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const passphrase = formData.get('passphrase') as string;
  const name = formData.get('name') as string || file?.name || 'Untitled';
  const category = formData.get('category') as string || 'other';

  if (!file || !passphrase) {
    return json({ error: 'File and passphrase are required' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const doc = await encryptAndStore(passphrase, buffer, {
    name,
    category,
    filename: file.name,
    mimeType: file.type
  });

  return json(doc, { status: 201 });
};

export const DELETE: RequestHandler = async ({ request }) => {
  const { id } = await request.json();
  if (!id) return json({ error: 'ID required' }, { status: 400 });
  removeDoc(id);
  return json({ ok: true });
};
