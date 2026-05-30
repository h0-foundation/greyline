import { listTravelers, createTraveler } from "$server/db/repositories/roster";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, travelers: listTravelers() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.name || typeof body.name !== "string") {
      return Response.json({ ok: false, error: "name is required" }, { status: 400 });
    }
    const traveler = createTraveler({
      name: body.name,
      role: body.role,
      email: body.email,
      phone: body.phone,
      emergency_contact: body.emergency_contact,
      blood_type: body.blood_type,
      notes: body.notes,
    });
    return Response.json({ ok: true, traveler }, { status: 201 });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
