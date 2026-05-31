import { getBundlesByType } from "$server/db/repositories/bundles";

export const dynamic = "force-dynamic";

// Manifest of offline map packs: the committed world basemap plus any regional
// street packs the user has registered. Lets the UI (and e2e) confirm the
// offline basemap is wired without inspecting the map canvas.
export async function GET() {
  return Response.json({ bundles: getBundlesByType("map") });
}
