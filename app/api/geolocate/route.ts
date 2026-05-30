import { proxyFetch, isApiEnabled } from "$server/services/api-gateway";
import { buildOverpassQuery, type OsmElement, type OverpassBbox } from "@/lib/geolocate";

export const dynamic = "force-dynamic";

// Feature-cluster geolocation lookup. Builds an Overpass QL union for the
// requested feature types within a bbox and proxies it through the api-gateway,
// which honours the per-connector toggle (OFF by default) + cache and refuses to
// fire unless the user has explicitly enabled the Overpass connector. The
// clustering/ranking happens client-side over the returned elements, so this
// route just fetches raw features. Fully optional: the tool also accepts a
// pasted Overpass JSON export with no network at all.

interface OverpassResponse {
  elements: OsmElement[];
}

function parseBbox(v: unknown): OverpassBbox | null {
  if (v === null || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const s = Number(o.s);
  const w = Number(o.w);
  const n = Number(o.n);
  const e = Number(o.e);
  if ([s, w, n, e].some((x) => Number.isNaN(x))) return null;
  if (s >= n || w >= e) return null;
  // Cap the bbox so a runaway query can't ask Overpass for a whole hemisphere.
  if (n - s > 2 || e - w > 2) return null;
  return { s, w, n, e };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Malformed JSON body" }, { status: 400 });
  }
  const o = (body ?? {}) as Record<string, unknown>;

  const types = Array.isArray(o.types) ? o.types.filter((t): t is string => typeof t === "string") : [];
  const bbox = parseBbox(o.bbox);
  if (types.length === 0) {
    return Response.json({ ok: false, error: "At least one feature type is required" }, { status: 400 });
  }
  if (!bbox) {
    return Response.json({ ok: false, error: "Invalid bounding box (max 2°×2°, s<n, w<e)" }, { status: 400 });
  }

  const query = buildOverpassQuery(types, bbox);
  if (!query) {
    return Response.json({ ok: false, error: "No known feature types requested" }, { status: 400 });
  }

  const enabled = isApiEnabled("overpass");
  if (!enabled) {
    return Response.json({ ok: true, enabled: false, elements: [] });
  }

  const result = await proxyFetch<OverpassResponse>({
    apiId: "overpass",
    url: "https://overpass-api.de/api/interpreter",
    params: { data: query },
    cacheTtlSeconds: 86_400,
  });

  return Response.json({ ok: true, enabled: true, elements: result?.data?.elements ?? [] });
}
