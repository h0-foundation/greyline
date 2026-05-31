import { getBundlesByType, getBundle, upsertBundle } from "$server/db/repositories/bundles";
import { fail, jsonError, jsonOk } from "@/lib/api";
import { existsSync, statSync } from "node:fs";
import { resolve, basename } from "node:path";

export const dynamic = "force-dynamic";

const MAPS_DIR = resolve("data/bundles/maps");

// Manifest of offline map packs: the committed world basemap plus any regional
// street packs the user has registered. Lets the UI (and e2e) confirm the
// offline basemap is wired without inspecting the map canvas.
export async function GET() {
  return Response.json({ bundles: getBundlesByType("map") });
}

// Register a regional street pack the user has placed in data/bundles/maps/.
// We never upload through here (packs can be hundreds of MB) — the file is
// dropped into the data dir and registered by filename.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const file = typeof body?.file === "string" ? basename(body.file.trim()) : "";
    if (!file || !file.endsWith(".pmtiles")) return jsonError("A .pmtiles filename is required.", 400);

    const path = resolve(MAPS_DIR, file);
    if (!path.startsWith(MAPS_DIR + "/") || !existsSync(path)) {
      return jsonError(`Place the pack in data/bundles/maps/ first — "${file}" wasn't found there.`, 404);
    }

    const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : file.replace(/\.pmtiles$/, "");
    const id = "pack-" + file.replace(/\.pmtiles$/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    upsertBundle({ id, type: "map", region: name, path: `data/bundles/maps/${file}`, size: statSync(path).size, checksum: null });
    return jsonOk({ bundle: getBundle(id) });
  } catch (err) {
    return fail("POST /api/bundles", err, "Could not register the pack.");
  }
}
