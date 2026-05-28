import { getSightings, createSighting, repeatMatches } from "$server/db/repositories/field";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ sightings: getSightings(), repeats: repeatMatches() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sighting = createSighting({
      lat: body.lat, lng: body.lng, description: body.description,
      person_desc: body.person_desc, vehicle_desc: body.vehicle_desc,
      threat_level: body.threat_level, tags: body.tags,
    });
    return Response.json({ ok: true, sighting }, { status: 201 });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
