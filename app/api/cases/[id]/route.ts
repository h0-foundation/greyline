import { getCase, getItems, getEvents, setStatus, deleteCase } from "$server/db/repositories/cases";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCase(id);
  if (!c) return Response.json({ ok: false, error: "not found" }, { status: 404 });
  return Response.json({ ok: true, case: c, items: getItems(id), events: getEvents(id) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    if (body?.status !== "open" && body?.status !== "closed") {
      return Response.json({ ok: false, error: "status must be open|closed" }, { status: 400 });
    }
    const updated = setStatus(id, body.status);
    if (!updated) return Response.json({ ok: false, error: "not found" }, { status: 404 });
    return Response.json({ ok: true, case: updated });
  } catch (err) {
    console.error("PATCH /api/cases/[id]", err);
    return Response.json({ ok: false, error: "Could not update case" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteCase(id);
  return Response.json({ ok: true });
}
