import { getCase, getItems, addTextItem, removeItem } from "$server/db/repositories/cases";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getCase(id)) return Response.json({ ok: false, error: "not found" }, { status: 404 });
  return Response.json({ ok: true, items: getItems(id) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getCase(id)) return Response.json({ ok: false, error: "not found" }, { status: 404 });
  try {
    const body = await req.json();
    if (typeof body?.kind !== "string" || typeof body?.body !== "string") {
      return Response.json({ ok: false, error: "kind and body required" }, { status: 400 });
    }
    const item = addTextItem({
      case_id: id,
      kind: body.kind,
      title: typeof body.title === "string" ? body.title.slice(0, 200) : null,
      body: body.body.slice(0, 20000),
    });
    return Response.json({ ok: true, item }, { status: 201 });
  } catch (err) {
    return fail("POST /api/cases/[id]/items", err, "Could not add the item.", 400);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = new URL(req.url).searchParams.get("item");
  if (!itemId) return Response.json({ ok: false, error: "item query param required" }, { status: 400 });
  removeItem(id, itemId);
  return Response.json({ ok: true });
}
