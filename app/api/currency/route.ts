import { getExchangeRates } from "$server/api-clients/exchange-rates";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const base = new URL(req.url).searchParams.get("base") || "USD";
  try {
    const rates = await getExchangeRates(base);
    if (!rates) {
      return Response.json({ ok: false, disabled: true, error: "Exchange-rates connection is off" }, { status: 503 });
    }
    return Response.json({ ok: true, base: base.toUpperCase(), rates: rates[base.toLowerCase()] ?? {} });
  } catch (err) {
    return fail("GET /api/currency", err, "Rate fetch failed.", 502);
  }
}
