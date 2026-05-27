import { updateChecklistItems, deleteChecklist } from "$server/db/repositories/checklist";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    if (!Array.isArray(body?.items)) {
      return Response.json({ ok: false, error: "items array required" }, { status: 400 });
    }
    const checklist = updateChecklistItems(id, body.items);
    return Response.json({ ok: true, checklist });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteChecklist(id);
  return Response.json({ ok: true });
}
