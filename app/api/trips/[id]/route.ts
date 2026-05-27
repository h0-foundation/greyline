import {
  getTripById,
  updateTrip,
  deleteTrip,
  getDestinationsByTrip,
} from "$server/db/repositories/trip";
import { getChecklistsByTrip } from "$server/db/repositories/checklist";
import { getThreatModelByTrip } from "$server/db/repositories/threat";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = getTripById(id);
  if (!trip) return Response.json({ ok: false, error: "not found" }, { status: 404 });
  return Response.json({
    trip,
    destinations: getDestinationsByTrip(id),
    checklists: getChecklistsByTrip(id),
    threatModel: getThreatModelByTrip(id) ?? null,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getTripById(id)) return Response.json({ ok: false, error: "not found" }, { status: 404 });
  try {
    const body = await req.json();
    const trip = updateTrip(id, {
      name: body.name,
      status: body.status,
      start_date: body.start_date,
      end_date: body.end_date,
      notes: body.notes,
    });
    return Response.json({ ok: true, trip });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteTrip(id);
  return Response.json({ ok: true });
}
