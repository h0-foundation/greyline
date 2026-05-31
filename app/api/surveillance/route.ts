import { getSightings, createSighting } from "$server/db/repositories/field";
import { analyzeTEDD } from "@/lib/tedd";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const sightings = getSightings();
  return Response.json({ sightings, signals: analyzeTEDD(sightings) });
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
    return fail("POST /api/surveillance", err, "Could not save the log entry.");
  }
}
