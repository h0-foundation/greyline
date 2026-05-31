import { deleteBundle } from "$server/db/repositories/bundles";
import { jsonError, jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

// Unregister a regional street pack (non-destructive — leaves the file on disk).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "map-world") return jsonError("The world basemap can't be removed.", 400);
  deleteBundle(id);
  return jsonOk();
}
