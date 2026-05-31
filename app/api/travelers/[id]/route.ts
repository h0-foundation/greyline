import { getTraveler, updateTraveler, setCheckin, deleteTraveler } from "$server/db/repositories/roster";
import type { CheckinStatus } from "@/lib/roster";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

const STATUSES: CheckinStatus[] = ["ok", "overdue", "sos", "unknown"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const traveler = getTraveler(id);
  if (!traveler) return Response.json({ ok: false, error: "not found" }, { status: 404 });
  return Response.json({ ok: true, traveler });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    // A check-in update is { checkin: <status> }; otherwise it's a field update.
    if (body?.checkin) {
      if (!STATUSES.includes(body.checkin)) {
        return Response.json({ ok: false, error: "invalid checkin status" }, { status: 400 });
      }
      const traveler = setCheckin(id, body.checkin);
      if (!traveler) return Response.json({ ok: false, error: "not found" }, { status: 404 });
      return Response.json({ ok: true, traveler });
    }
    const traveler = updateTraveler(id, body ?? {});
    if (!traveler) return Response.json({ ok: false, error: "not found" }, { status: 404 });
    return Response.json({ ok: true, traveler });
  } catch (err) {
    return fail("PATCH /api/travelers/[id]", err, "Could not update the traveller.");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteTraveler(id);
  return Response.json({ ok: true });
}
