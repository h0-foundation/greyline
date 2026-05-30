import { getDb } from "../index";
import { v4 as uuid } from "uuid";
import { sha256Hex } from "../../crypto/hash";

// Investigation case-file + chain-of-custody. Every mutation appends a row to
// case_events (append-only) so the case's provenance is demonstrable on hand-off.
// Item `kind` is validated against an allowlist (also enforced by a CHECK
// constraint) so no caller value reaches SQL as an identifier.

export interface CaseRow {
  id: string;
  title: string;
  summary: string | null;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
}

export interface CaseItem {
  id: string;
  case_id: string;
  kind: "note" | "url" | "observation" | "file";
  title: string | null;
  body: string | null;
  file_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  sha256: string;
  created_at: string;
}

export interface CaseEvent {
  id: string;
  case_id: string;
  item_id: string | null;
  type: string;
  detail: string | null;
  at: string;
}

const TEXT_KINDS = new Set(["note", "url", "observation"]);

function logEvent(caseId: string, type: string, detail: string | null, itemId: string | null = null): void {
  getDb()
    .prepare("INSERT INTO case_events (id, case_id, item_id, type, detail) VALUES (?,?,?,?,?)")
    .run(uuid(), caseId, itemId, type, detail);
}

function touchCase(caseId: string): void {
  getDb().prepare("UPDATE cases SET updated_at = datetime('now') WHERE id = ?").run(caseId);
}

export function listCases(): Array<CaseRow & { item_count: number }> {
  return getDb()
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM case_items i WHERE i.case_id = c.id) AS item_count
       FROM cases c ORDER BY c.updated_at DESC`,
    )
    .all() as Array<CaseRow & { item_count: number }>;
}

export function getCase(id: string): CaseRow | null {
  return (getDb().prepare("SELECT * FROM cases WHERE id = ?").get(id) as CaseRow) ?? null;
}

export function getItems(caseId: string): CaseItem[] {
  return getDb()
    .prepare("SELECT * FROM case_items WHERE case_id = ? ORDER BY created_at ASC")
    .all(caseId) as CaseItem[];
}

export function getEvents(caseId: string): CaseEvent[] {
  return getDb()
    .prepare("SELECT * FROM case_events WHERE case_id = ? ORDER BY at ASC, rowid ASC")
    .all(caseId) as CaseEvent[];
}

export function createCase(input: { title: string; summary?: string | null }): CaseRow {
  const title = (input.title ?? "").trim();
  if (!title) throw new Error("title required");
  const id = uuid();
  getDb()
    .prepare("INSERT INTO cases (id, title, summary) VALUES (?,?,?)")
    .run(id, title, input.summary?.trim() || null);
  logEvent(id, "case_created", title);
  return getCase(id)!;
}

/** Add a text evidence item (note / url / observation). SHA-256 over the body
 *  is the intake integrity anchor. File items are handled separately. */
export function addTextItem(input: {
  case_id: string;
  kind: string;
  title?: string | null;
  body: string;
}): CaseItem {
  if (!TEXT_KINDS.has(input.kind)) throw new Error("invalid item kind");
  const body = (input.body ?? "").trim();
  if (!body) throw new Error("body required");
  if (!getCase(input.case_id)) throw new Error("case not found");
  const id = uuid();
  const sha256 = sha256Hex(body);
  getDb()
    .prepare(
      "INSERT INTO case_items (id, case_id, kind, title, body, sha256) VALUES (?,?,?,?,?,?)",
    )
    .run(id, input.case_id, input.kind, input.title?.trim() || null, body, sha256);
  logEvent(input.case_id, "item_added", `${input.kind}: ${input.title?.trim() || body.slice(0, 60)} · sha256 ${sha256.slice(0, 12)}…`, id);
  touchCase(input.case_id);
  return getDb().prepare("SELECT * FROM case_items WHERE id = ?").get(id) as CaseItem;
}

export function removeItem(caseId: string, itemId: string): void {
  const item = getDb().prepare("SELECT * FROM case_items WHERE id = ? AND case_id = ?").get(itemId, caseId) as CaseItem | undefined;
  if (!item) return;
  getDb().prepare("DELETE FROM case_items WHERE id = ?").run(itemId);
  // The removal itself is a custody event — the audit trail is never rewritten.
  logEvent(caseId, "item_removed", `${item.kind}: ${item.title || item.body?.slice(0, 60) || itemId} · sha256 ${item.sha256.slice(0, 12)}…`, itemId);
  touchCase(caseId);
}

export function setStatus(id: string, status: "open" | "closed"): CaseRow | null {
  if (status !== "open" && status !== "closed") throw new Error("invalid status");
  const existing = getCase(id);
  if (!existing) return null;
  getDb().prepare("UPDATE cases SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  logEvent(id, "status_changed", status);
  return getCase(id);
}

export function deleteCase(id: string): void {
  // FK ON DELETE CASCADE removes items + events with the case.
  getDb().prepare("DELETE FROM cases WHERE id = ?").run(id);
}
