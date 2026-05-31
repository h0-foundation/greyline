import { getApiToggles, setApiToggle, setApiKey } from "$server/db/repositories/settings";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// Never leaks raw keys — getApiToggles returns has_key, not api_key.
export async function GET() {
  return Response.json(getApiToggles());
}

// Update a connection: { api_id, enabled?, use_tor?, api_key? }. enabled flips the
// toggle; api_key (string sets, "" / null clears) sets the stored key — the two
// are independent (a key alone never enables a connector).
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const apiId = body?.api_id;
    if (typeof apiId !== "string") {
      return Response.json({ ok: false, error: "Expected { api_id: string }" }, { status: 400 });
    }
    if (typeof body?.enabled === "boolean") {
      setApiToggle(apiId, body.enabled, body.use_tor === true);
    }
    if ("api_key" in body) {
      const key = typeof body.api_key === "string" && body.api_key.trim() ? body.api_key.trim() : null;
      setApiKey(apiId, key);
    }
    return Response.json({ ok: true });
  } catch (err) {
    return fail("PATCH /api/toggles", err, "Could not update the connection.");
  }
}
