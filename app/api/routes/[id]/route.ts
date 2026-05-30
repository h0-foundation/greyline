import { deleteRoute } from "$server/db/repositories/routes";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteRoute(id);
  return Response.json({ ok: true });
}
