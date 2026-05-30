import { listCases, createCase } from "$server/db/repositories/cases";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, cases: listCases() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body?.title !== "string" || !body.title.trim()) {
      return Response.json({ ok: false, error: "title required" }, { status: 400 });
    }
    const created = createCase({
      title: body.title.slice(0, 200),
      summary: typeof body.summary === "string" ? body.summary.slice(0, 2000) : null,
    });
    return Response.json({ ok: true, case: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/cases", err);
    return Response.json({ ok: false, error: "Could not create case" }, { status: 400 });
  }
}
