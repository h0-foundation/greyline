import { getDb } from "../index";

// Offline OFAC sanctions screening over the bundled SDN + Consolidated lists.
// A query matches against every searchable string (primary names + a.k.a.
// aliases); results are grouped back to the listed entity. No network — the
// lists are bundled at build time (scripts/build-data.ts → migration 019).

export interface SanctionEntry {
  list: string;
  ent_num: number;
  name: string;
  sdn_type: string | null;
  program: string | null;
  remarks: string | null;
  aliases: string[];
  /** Whether the query hit the primary listed name or an alias. */
  matched_via: "name" | "alias";
}

/** Screen a name against OFAC. Substring, case-insensitive (ASCII). */
export function screenSanctions(query: string, limit = 50): SanctionEntry[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT e.list, e.ent_num, e.name, e.sdn_type, e.program, e.remarks,
              MAX(CASE WHEN n.name LIKE ? AND n.is_primary = 1 THEN 1 ELSE 0 END) AS hit_primary
       FROM sanctions_entries e
       JOIN sanctions_names n ON n.list = e.list AND n.ent_num = e.ent_num AND n.name LIKE ?
       GROUP BY e.list, e.ent_num
       ORDER BY hit_primary DESC, e.name
       LIMIT ?`,
    )
    .all(like, like, limit) as Array<{
    list: string; ent_num: number; name: string; sdn_type: string | null;
    program: string | null; remarks: string | null; hit_primary: number;
  }>;

  const aliasStmt = db.prepare(
    `SELECT name FROM sanctions_names WHERE list = ? AND ent_num = ? AND is_primary = 0 ORDER BY name`,
  );
  return rows.map((r) => ({
    list: r.list,
    ent_num: r.ent_num,
    name: r.name,
    sdn_type: r.sdn_type,
    program: r.program,
    remarks: r.remarks,
    aliases: (aliasStmt.all(r.list, r.ent_num) as { name: string }[]).map((a) => a.name),
    matched_via: r.hit_primary ? "name" : "alias",
  }));
}

/** Count of listed entities — for the tool's "screening N entries" copy. */
export function sanctionsCount(): number {
  const row = getDb().prepare(`SELECT COUNT(*) AS c FROM sanctions_entries`).get() as { c: number };
  return row.c;
}
