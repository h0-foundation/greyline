import { analyzeJpegExif, stripJpegExif } from "$server/services/exif";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// Accepts a multipart upload of a JPEG; returns the detected metadata plus the
// cleaned bytes (base64) so the client can offer a stripped download. The image
// never leaves the local server — processed in-memory, nothing persisted.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const analysis = analyzeJpegExif(buffer);
    const { stripped, removedBytes } = stripJpegExif(buffer);
    return Response.json({
      ok: true,
      filename: file.name,
      originalSize: buffer.length,
      removedBytes,
      analysis,
      stripped: stripped.toString("base64"),
    });
  } catch (err) {
    return fail("POST /api/tools/exif", err, "Could not read the file's metadata.");
  }
}
