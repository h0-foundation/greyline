import { getAllSettings, setSetting } from "$server/db/repositories/settings";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getAllSettings());
}

// Accepts a flat { key: value } map and persists each entry.
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ ok: false, error: "Expected an object" }, { status: 400 });
    }
    for (const [key, value] of Object.entries(body)) {
      setSetting(key, String(value));
    }
    return Response.json({ ok: true });
  } catch (err) {
    return fail("PATCH /api/settings", err, "Could not save settings.");
  }
}
