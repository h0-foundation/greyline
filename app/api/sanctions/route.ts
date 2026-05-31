import { screenSanctions, sanctionsCount } from "$server/db/repositories/sanctions";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// Offline OFAC sanctions screening. Bundled data, so this never touches the
// network and is always available — there is no connector toggle to gate.
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    const count = sanctionsCount();
    if (!q) return Response.json({ ok: true, query: "", count, results: [] });
    return Response.json({ ok: true, query: q, count, results: screenSanctions(q) });
  } catch (err) {
    return fail("GET /api/sanctions", err, "Could not screen the sanctions lists.", 500);
  }
}
