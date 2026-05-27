import { getTravelAdvisories } from "$server/api-clients/travel-advisory";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getTravelAdvisories();
  if (!data) {
    return Response.json({ ok: false, disabled: true, error: "Travel-advisory connection is off" }, { status: 503 });
  }
  return Response.json({ ok: true, advisories: data });
}
