import { getRallyPoints, createRallyPoint } from "$server/db/repositories/field";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const tripId = new URL(req.url).searchParams.get("trip") || undefined;
  return Response.json(getRallyPoints(tripId));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.name || typeof body.lat !== "number" || typeof body.lng !== "number") {
      return Response.json({ ok: false, error: "name, lat, lng required" }, { status: 400 });
    }
    const point = createRallyPoint({
      trip_id: body.trip_id, name: body.name, lat: body.lat, lng: body.lng,
      time_start: body.time_start, time_end: body.time_end, instructions: body.instructions,
    });
    return Response.json({ ok: true, point }, { status: 201 });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
