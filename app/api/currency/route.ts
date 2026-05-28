import { getExchangeRates } from "$server/api-clients/exchange-rates";

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
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Rate fetch failed" }, { status: 502 });
  }
}
