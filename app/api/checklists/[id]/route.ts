import { updateChecklistItems, deleteChecklist } from "$server/db/repositories/checklist";
import { fail } from "@/lib/api";

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
    return fail("PATCH /api/checklists/[id]", err, "Could not update the checklist.");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteChecklist(id);
  return Response.json({ ok: true });
}
