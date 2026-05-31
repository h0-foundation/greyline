import { getApiToggles, setApiToggle } from "$server/db/repositories/settings";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getApiToggles());
}

// Flip a single connection: { api_id, enabled, use_tor? }.
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const apiId = body?.api_id;
    if (typeof apiId !== "string" || typeof body?.enabled !== "boolean") {
      return Response.json(
        { ok: false, error: "Expected { api_id: string, enabled: boolean }" },
        { status: 400 },
      );
    }
    setApiToggle(apiId, body.enabled, body.use_tor === true);
    return Response.json({ ok: true });
  } catch (err) {
    return fail("PATCH /api/toggles", err, "Could not update the connection.");
  }
}
