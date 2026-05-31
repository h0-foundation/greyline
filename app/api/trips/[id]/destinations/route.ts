import { getDestinationsByTrip, createDestination } from "$server/db/repositories/trip";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return Response.json(getDestinationsByTrip(id));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const dest = createDestination(id, {
      country_code: body.country_code,
      city: body.city,
      lat: body.lat,
      lng: body.lng,
      arrival_date: body.arrival_date,
      departure_date: body.departure_date,
      notes: body.notes,
      sort_order: body.sort_order,
    });
    return Response.json({ ok: true, destination: dest }, { status: 201 });
  } catch (err) {
    return fail("POST /api/trips/[id]/destinations", err, "Could not update destinations.");
  }
}
