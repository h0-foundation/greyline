import { deleteSighting } from "$server/db/repositories/field";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteSighting(id);
  return Response.json({ ok: true });
}
