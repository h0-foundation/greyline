/**
 * One-off importer for a markdown foreign-travel logbook (### Trip N. 🇽🇽 Country (City) — DATES · CODE).
 * Parses each trip header into a trip + per-country destinations. Idempotent:
 * removes previously-imported rows (tagged in notes) before re-inserting.
 *
 *   npx tsx scripts/import-travel-log.ts "<path-to-logbook.md>"
 */
import { getDb, closeDb } from "../server/db/index";
import { readFileSync } from "fs";
import { v4 as uuid } from "uuid";

const TAG = "[imported:travel-log]";
const path = process.argv[2] || "/Users/enriqueoti/Personal/03-Travel/TRAVEL-LOG/foreign_travel_EAO4.md";

/** Regional-indicator flag emoji → ISO2 (🇲🇽 → "MX"). */
function flagsToIso2(s: string): string[] {
  const out: string[] = [];
  const re = /([\u{1F1E6}-\u{1F1FF}])([\u{1F1E6}-\u{1F1FF}])/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const a = m[1].codePointAt(0)! - 0x1f1e6 + 65;
    const b = m[2].codePointAt(0)! - 0x1f1e6 + 65;
    out.push(String.fromCharCode(a) + String.fromCharCode(b));
  }
  return out;
}

/** First & last YYYY-MM(-DD) tokens → normalized ISO dates (pad day = 01), plus
 *  the precision actually present in the source (day if any token had a day). */
function parseDates(s: string): { start: string | null; end: string | null; precision: string } {
  const re = /(\d{4})-(\d{2})(?:-(\d{2}))?/g;
  const dates: string[] = [];
  let hasDay = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m[3]) hasDay = true;
    dates.push(`${m[1]}-${m[2]}-${m[3] ?? "01"}`);
  }
  if (dates.length === 0) return { start: null, end: null, precision: "unknown" };
  return { start: dates[0], end: dates[dates.length - 1], precision: hasDay ? "day" : "month" };
}

function main() {
  const md = readFileSync(path, "utf-8");
  const headers = md.split("\n").filter((l) => /^###\s+Trip\s+\d+\./.test(l));
  if (headers.length === 0) throw new Error("No '### Trip N.' headers found");

  const db = getDb();

  // Idempotent: clear prior import (destinations cascade via FK).
  const prior = db.prepare(`SELECT id FROM trips WHERE notes LIKE ?`).all(`%${TAG}%`) as { id: string }[];
  const delDest = db.prepare("DELETE FROM destinations WHERE trip_id = ?");
  const delTrip = db.prepare("DELETE FROM trips WHERE id = ?");
  for (const t of prior) { delDest.run(t.id); delTrip.run(t.id); }
  if (prior.length) console.log(`Cleared ${prior.length} previously-imported trips`);

  const today = new Date().toISOString().slice(0, 10);
  const insTrip = db.prepare(
    "INSERT INTO trips (id, name, status, start_date, end_date, notes, date_precision, created_at, updated_at) VALUES (?,?,?,?,?,?,?,datetime('now'),datetime('now'))",
  );
  const insDest = db.prepare(
    "INSERT INTO destinations (id, trip_id, country_code, city, arrival_date, departure_date, sort_order, notes) VALUES (?,?,?,?,?,?,?,?)",
  );

  let trips = 0, dests = 0;
  const run = db.transaction(() => {
    for (const line of headers) {
      const content = line.replace(/^###\s+/, "");
      const iso = flagsToIso2(content);
      if (iso.length === 0) continue;
      const { start, end, precision } = parseDates(content);
      const code = content.match(/`([A-Z]{2})`/)?.[1] ?? "";
      // City from the first parenthetical, if any.
      const city = content.match(/\(([^)]+)\)/)?.[1]?.split(/[/+]/)[0].trim() ?? null;
      // Name: strip "Trip N." prefix, flags, and trailing "· CODE ·…".
      const name = content
        .replace(/^Trip\s+\d+\.\s*/, "")
        .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
        .split(" · ")[0]
        .trim();

      const status = end && end < today ? "wrapped" : "planning";
      const tripId = uuid();
      insTrip.run(tripId, name || iso[0], status, start, end, `${TAG} status:${code}`, precision);
      trips++;
      iso.forEach((cc, i) => {
        insDest.run(uuid(), tripId, cc, i === 0 ? city : null, start, end, i, null);
        dests++;
      });
    }
  });
  run();

  const distinct = db.prepare(
    `SELECT COUNT(DISTINCT country_code) c FROM destinations d JOIN trips t ON t.id = d.trip_id WHERE t.notes LIKE ?`,
  ).get(`%${TAG}%`) as { c: number };

  console.log(`Imported ${trips} trips, ${dests} destinations across ${distinct.c} distinct countries.`);
  closeDb();
}

main();
