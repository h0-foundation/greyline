import { getChecklistsByTrip, createChecklist } from "$server/db/repositories/checklist";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return Response.json(getChecklistsByTrip(id));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const checklist = createChecklist({
      trip_id: id,
      destination_id: body.destination_id ?? undefined,
      type: body.type ?? "custom",
      name: body.name,
      items: body.items ?? [],
    });
    return Response.json({ ok: true, checklist }, { status: 201 });
  } catch (err) {
    return fail("POST /api/trips/[id]/checklists", err, "Could not update the checklist.");
  }
}
