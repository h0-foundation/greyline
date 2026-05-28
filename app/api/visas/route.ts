import { getVisasForPassport, getVisaRequirement } from "$server/db/repositories/intel";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const passport = sp.get("passport");
  const dest = sp.get("dest");
  if (!passport) return Response.json({ ok: false, error: "passport required" }, { status: 400 });
  if (dest) return Response.json(getVisaRequirement(passport, dest) ?? null);
  return Response.json(getVisasForPassport(passport));
}
