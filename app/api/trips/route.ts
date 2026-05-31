import { getAllTrips, createTrip } from "$server/db/repositories/trip";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getAllTrips());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.name || typeof body.name !== "string") {
      return Response.json({ ok: false, error: "name is required" }, { status: 400 });
    }
    const trip = createTrip({
      name: body.name,
      start_date: body.start_date,
      end_date: body.end_date,
      notes: body.notes,
    });
    return Response.json({ ok: true, trip }, { status: 201 });
  } catch (err) {
    return fail("POST /api/trips", err, "Could not save the trip.");
  }
}
