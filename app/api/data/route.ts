import { getDb } from "$server/db/index";

export const dynamic = "force-dynamic";

// User-generated tables (reference datasets like airports/visas/country_* are
// re-derivable from bundles via `pnpm build:data`, so we don't export them).
const USER_TABLES = [
  "settings",
  "api_toggles",
  "trips",
  "destinations",
  "checklists",
  "saved_routes",
  "rally_points",
  "counter_surveillance_log",
  "incident_log",
  "threat_models",
  "vault_docs",
];

export async function GET() {
  const db = getDb();
  const data: Record<string, unknown[]> = {};
  for (const t of USER_TABLES) {
    try { data[t] = db.prepare(`SELECT * FROM ${t}`).all(); } catch { data[t] = []; }
  }
  const body = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), data }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="greyline-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

// Restore from a backup: replace rows in the user tables (idempotent per-row).
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const data = payload?.data;
    if (!data || typeof data !== "object") {
      return Response.json({ ok: false, error: "Invalid backup file" }, { status: 400 });
    }
    const db = getDb();
    let restored = 0;
    const tx = db.transaction(() => {
      for (const table of USER_TABLES) {
        const rows = data[table];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        for (const row of rows) {
          const cols = Object.keys(row);
          const placeholders = cols.map(() => "?").join(", ");
          db.prepare(
            `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
          ).run(...cols.map((c) => (row as Record<string, unknown>)[c]));
          restored++;
        }
      }
    });
    tx();
    return Response.json({ ok: true, restored });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// Wipe all user data (keeps bundled reference data and settings defaults intact).
export async function DELETE() {
  const db = getDb();
  const tx = db.transaction(() => {
    for (const t of USER_TABLES) {
      if (t === "settings" || t === "api_toggles") continue; // keep preferences
      try { db.prepare(`DELETE FROM ${t}`).run(); } catch { /* table may not exist */ }
    }
  });
  tx();
  return Response.json({ ok: true });
}
