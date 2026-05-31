import { getBundle } from "$server/db/repositories/bundles";
import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, basename } from "node:path";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";

// Regional street packs live in the data volume (outside public/), so they need
// an explicit range-aware streamer — PMTiles issues HTTP range reads for the
// header and individual tiles.
const MAPS_DIR = resolve("data/bundles/maps");

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = getBundle(id);
  if (!bundle || bundle.type !== "map") return new Response("Not found", { status: 404 });

  // Confine to MAPS_DIR (defence in depth — registration stores a basename).
  const file = resolve(MAPS_DIR, basename(bundle.path));
  if (!file.startsWith(MAPS_DIR + "/") || !existsSync(file)) return new Response("Not found", { status: 404 });

  const size = statSync(file).size;
  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
  };

  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m && m[1] ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : size - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= size) {
      return new Response("Range Not Satisfiable", { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    headers["Content-Length"] = String(end - start + 1);
    const body = Readable.toWeb(createReadStream(file, { start, end })) as unknown as ReadableStream<Uint8Array>;
    return new Response(body, { status: 206, headers });
  }

  headers["Content-Length"] = String(size);
  const body = Readable.toWeb(createReadStream(file)) as unknown as ReadableStream<Uint8Array>;
  return new Response(body, { status: 200, headers });
}
