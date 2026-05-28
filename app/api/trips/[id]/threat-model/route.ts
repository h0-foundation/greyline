import { getThreatModelByTrip, upsertThreatModel } from "$server/db/repositories/threat";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return Response.json(getThreatModelByTrip(id) ?? null);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const model = upsertThreatModel({
      trip_id: id,
      assets: body.assets,
      adversaries: body.adversaries,
      capability: body.capability,
      consequence: body.consequence,
      effort: body.effort,
      computed_level: body.computed_level,
      notes: body.notes,
    });
    return Response.json({ ok: true, threatModel: model });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
