import { nearestAirports } from "$server/db/repositories/airports";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const limitRaw = Number(sp.get("limit"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return Response.json({ ok: false, error: "Invalid lat/lng" }, { status: 400 });
  }
  const limit = Number.isFinite(limitRaw) ? Math.min(20, Math.max(1, Math.round(limitRaw))) : 6;

  const airports = nearestAirports(lat, lng, limit);

  // Dispersion: angular spread of the bearings to the top 5 alternates. A tight
  // cluster means escape routes funnel through the same direction — limited egress.
  const top = airports.slice(0, 5);
  let dispersion_deg = 0;
  let egress_flag = false;
  let egress_note: string | null = null;

  if (top.length >= 2) {
    const bearings = top.map((a) => a.bearing_deg).sort((a, b) => a - b);
    // Largest gap between consecutive bearings around the circle; spread = 360 − gap.
    let maxGap = 0;
    for (let i = 0; i < bearings.length; i++) {
      const next = i === bearings.length - 1 ? (bearings[0] ?? 0) + 360 : (bearings[i + 1] ?? 0);
      maxGap = Math.max(maxGap, next - (bearings[i] ?? 0));
    }
    dispersion_deg = Math.round(360 - maxGap);
    if (dispersion_deg < 90) {
      egress_flag = true;
      egress_note = "alternates clustered — limited overland egress";
    }
  }

  return Response.json({ ok: true, airports, dispersion_deg, egress_flag, egress_note });
}
