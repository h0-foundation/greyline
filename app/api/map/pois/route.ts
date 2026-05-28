import { getSurveillanceCameras } from "$server/api-clients/overpass";

export const dynamic = "force-dynamic";

// Surveillance-camera POIs within a bounding box (OSM via Overpass, behind the
// connection toggle). Returns 503 when the connection is off.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const nums = ["south", "west", "north", "east"].map((k) => parseFloat(sp.get(k) || ""));
  if (nums.some(Number.isNaN)) {
    return Response.json({ ok: false, error: "south,west,north,east required" }, { status: 400 });
  }
  const [south, west, north, east] = nums;
  const cameras = await getSurveillanceCameras(south, west, north, east);
  if (!cameras) return Response.json({ ok: false, disabled: true }, { status: 503 });
  return Response.json({ ok: true, cameras });
}
