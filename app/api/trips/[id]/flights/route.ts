import { NextRequest, NextResponse } from "next/server";
import {
  createFlight,
  deleteFlight,
  getFlightsByTrip,
  updateFlight,
  type FlightRow,
} from "$server/db/repositories/flight";
import { getTripById } from "$server/db/repositories/trip";

// Hand validator — keeps the surface tiny; we accept very few fields and
// strictly clip lengths inside the repo, so a runtime guard here is enough.
function cleanInput(raw: unknown): {
  ok: true; value: Partial<FlightRow>;
} | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "expected object" };
  const r = raw as Record<string, unknown>;
  const allow = new Set([
    "carrier_iata","flight_number","dep_iata","dep_time","arr_iata","arr_time","seat","status","notes",
  ]);
  const value: Record<string, unknown> = {};
  for (const k of Object.keys(r)) {
    if (!allow.has(k)) continue;
    value[k] = r[k];
  }
  if (value.status !== undefined && !["planned", "booked", "flown", "cancelled"].includes(value.status as string)) {
    return { ok: false, error: "invalid status" };
  }
  return { ok: true, value: value as Partial<FlightRow> };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getTripById(id)) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json({ flights: getFlightsByTrip(id) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getTripById(id)) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  const body = cleanInput(await req.json().catch(() => null));
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: 400 });
  const row = createFlight(id, body.value);
  return NextResponse.json({ flight: row }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const flightId = typeof raw?.id === "string" ? raw.id : "";
  if (!flightId) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = cleanInput(raw);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: 400 });
  const row = updateFlight(flightId, body.value);
  if (!row) return NextResponse.json({ error: "Flight not found" }, { status: 404 });
  return NextResponse.json({ flight: row });
}

export async function DELETE(req: NextRequest) {
  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const flightId = typeof raw?.id === "string" ? raw.id : "";
  if (!flightId) return NextResponse.json({ error: "id required" }, { status: 400 });
  deleteFlight(flightId);
  return NextResponse.json({ ok: true });
}
