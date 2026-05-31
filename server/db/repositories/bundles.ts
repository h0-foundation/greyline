import { getDb } from "../index";

// offline_bundles tracks downloaded/committed offline data packs. Today it backs
// the committed world basemap (type 'map', region 'world') and user-added
// regional street packs. The table's CHECK constraint allowlists `type`.

export interface OfflineBundle {
  id: string;
  type: "map" | "country" | "cultural" | "currency" | "surveillance" | "transit";
  region: string | null;
  path: string;
  size: number | null;
  downloaded_at: string;
  checksum: string | null;
}

export function getBundlesByType(type: OfflineBundle["type"]): OfflineBundle[] {
  return getDb()
    .prepare("SELECT * FROM offline_bundles WHERE type = ? ORDER BY downloaded_at DESC")
    .all(type) as OfflineBundle[];
}

export function getBundle(id: string): OfflineBundle | undefined {
  return getDb().prepare("SELECT * FROM offline_bundles WHERE id = ?").get(id) as OfflineBundle | undefined;
}

export function getMapBundle(region = "world"): OfflineBundle | undefined {
  return getDb()
    .prepare("SELECT * FROM offline_bundles WHERE type = 'map' AND region = ? LIMIT 1")
    .get(region) as OfflineBundle | undefined;
}

export function upsertBundle(b: {
  id: string;
  type: OfflineBundle["type"];
  region?: string | null;
  path: string;
  size?: number | null;
  checksum?: string | null;
}): void {
  getDb()
    .prepare(
      `INSERT INTO offline_bundles (id, type, region, path, size, checksum)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         type = excluded.type, region = excluded.region, path = excluded.path,
         size = excluded.size, checksum = excluded.checksum,
         downloaded_at = datetime('now')`,
    )
    .run(b.id, b.type, b.region ?? null, b.path, b.size ?? null, b.checksum ?? null);
}

export function deleteBundle(id: string): void {
  getDb().prepare("DELETE FROM offline_bundles WHERE id = ?").run(id);
}
