import { updateDestination, deleteDestination } from "$server/db/repositories/trip";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    // updateDestination allowlists columns internally, so forwarding the parsed
    // body cannot inject SQL; unknown keys are ignored.
    const dest = updateDestination(id, body);
    return Response.json({ ok: true, destination: dest });
  } catch (err) {
    // Don't echo raw exception strings (may contain query/path fragments).
    console.error("PATCH /api/destinations/[id] failed:", err);
    return Response.json({ ok: false, error: "Could not update destination." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteDestination(id);
  return Response.json({ ok: true });
}
