import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { stripJpegExif, analyzeJpegExif } from '$server/services/exif.js';

export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const action = formData.get('action') as string || 'strip';

  if (!file) {
    return json({ error: 'No file provided' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (action === 'analyze') {
    const metadata = analyzeJpegExif(buffer);
    return json({ metadata, filename: file.name, size: buffer.length });
  }

  // Strip
  const { stripped, removedBytes } = stripJpegExif(buffer);

  return new Response(new Uint8Array(stripped), {
    headers: {
      'Content-Type': file.type || 'image/jpeg',
      'Content-Disposition': `attachment; filename="clean_${file.name}"`,
      'Content-Length': stripped.length.toString(),
      'X-Removed-Bytes': removedBytes.toString(),
      'X-Original-Size': buffer.length.toString()
    }
  });
};
