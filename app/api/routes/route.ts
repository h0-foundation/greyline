import { getRoutes, createRoute } from "$server/db/repositories/routes";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const tripId = new URL(req.url).searchParams.get("trip") || undefined;
  return Response.json({ ok: true, routes: getRoutes(tripId) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!Array.isArray(body?.waypoints) || body.waypoints.length < 2) {
      return Response.json({ ok: false, error: "waypoints (at least 2) required" }, { status: 400 });
    }
    if (typeof body.type !== "string") {
      return Response.json({ ok: false, error: "type required" }, { status: 400 });
    }
    const route = createRoute({
      trip_id: typeof body.trip_id === "string" ? body.trip_id : null,
      type: body.type,
      name: typeof body.name === "string" ? body.name.slice(0, 200) : null,
      waypoints: body.waypoints,
      distance_m: typeof body.distance_m === "number" ? body.distance_m : null,
      notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : null,
    });
    return Response.json({ ok: true, route }, { status: 201 });
  } catch (err) {
    console.error("POST /api/routes", err);
    return Response.json({ ok: false, error: "Could not save route" }, { status: 400 });
  }
}
