import { updateDestination, deleteDestination } from "$server/db/repositories/trip";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const dest = updateDestination(id, body);
    return Response.json({ ok: true, destination: dest });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteDestination(id);
  return Response.json({ ok: true });
}
