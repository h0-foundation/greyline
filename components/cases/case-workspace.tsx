"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Link2, Eye, Plus, Trash2, History, Hash, Lock, Unlock, ScanText, ArrowRight, Download, Search, MapPinned, Eraser, Fingerprint, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractEntities, groupEntities } from "@/lib/ner";
import { CaseImageDedup } from "@/components/cases/case-image-dedup";

// On-device tools an investigator pivots to from inside a case. Kept in sync
// with lib/tools.ts (Verify & investigate group) by intent, not import, so this
// can stay a plain client component.
const INVESTIGATE_LINKS = [
  { href: "/tools/verify", label: "Verify (SIFT)", icon: Search },
  { href: "/tools/geolocate", label: "Geolocate", icon: MapPinned },
  { href: "/tools/sanitize", label: "Sanitize & redact", icon: Eraser },
  { href: "/tools/image-hash", label: "Image fingerprint", icon: Fingerprint },
  { href: "/tools/chrono", label: "Chronolocation", icon: Sun },
] as const;

// Local mirrors of the repo row shapes (kept here so this client component never
// imports the SQLite-bound server module).
type CaseRow = {
  id: string;
  title: string;
  summary: string | null;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
};
type CaseItem = {
  id: string;
  kind: "note" | "url" | "observation" | "file";
  title: string | null;
  body: string | null;
  sha256: string;
  created_at: string;
};
type CaseEvent = { id: string; type: string; detail: string | null; at: string };

const KIND_META: Record<string, { icon: typeof FileText; label: string }> = {
  note: { icon: FileText, label: "Note" },
  url: { icon: Link2, label: "Link" },
  observation: { icon: Eye, label: "Observation" },
  file: { icon: FileText, label: "File" },
};

const EVENT_LABEL: Record<string, string> = {
  case_created: "Case opened",
  item_added: "Evidence added",
  item_removed: "Evidence removed",
  status_changed: "Status changed",
  note: "Note",
};

export function CaseWorkspace({
  initial,
}: {
  initial: { case: CaseRow; items: CaseItem[]; events: CaseEvent[] };
}) {
  const router = useRouter();
  const [c, setC] = useState(initial.case);
  const [items, setItems] = useState(initial.items);
  const [events, setEvents] = useState(initial.events);
  const [kind, setKind] = useState<"note" | "url" | "observation">("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entity extraction across every evidence item's text — runs on-device.
  const entityGroups = useMemo(
    () => groupEntities(extractEntities(items.map((i) => `${i.title ?? ""}\n${i.body ?? ""}`).join("\n"))),
    [items],
  );

  async function refetch() {
    const res = await fetch(`/api/cases/${c.id}`);
    const data = await res.json();
    if (data.ok) {
      setC(data.case);
      setItems(data.items);
      setEvents(data.events);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${c.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, body }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not add item");
      setTitle("");
      setBody("");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Remove this item? The removal itself is recorded in the chain of custody.")) return;
    await fetch(`/api/cases/${c.id}/items?item=${id}`, { method: "DELETE" });
    await refetch();
  }

  async function toggleStatus() {
    const next = c.status === "open" ? "closed" : "open";
    await fetch(`/api/cases/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await refetch();
  }

  async function del() {
    if (!confirm("Delete this entire case and all its evidence? This cannot be undone.")) return;
    await fetch(`/api/cases/${c.id}`, { method: "DELETE" });
    router.push("/cases");
  }

  // Export the whole case — metadata, evidence (with its intake SHA-256), and the
  // append-only chain of custody — as a single self-contained JSON file, so the
  // case (and its provenance) can be archived or handed off. Pure client-side;
  // nothing is uploaded.
  function exportCase() {
    const payload = {
      exported_at: new Date().toISOString(),
      tool: "Greyline case-file export v1",
      case: c,
      items,
      chain_of_custody: events,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = c.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "case";
    a.href = url;
    a.download = `${safe}-case.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">{c.title}</h1>
          {c.summary && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{c.summary}</p>}
          <p className="mt-1 font-mono text-xs text-faint">opened {c.created_at.slice(0, 10)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={toggleStatus}>
            {c.status === "open" ? <Lock className="size-4" /> : <Unlock className="size-4" />}
            {c.status === "open" ? "Close case" : "Reopen"}
          </Button>
          <Button variant="ghost" size="sm" onClick={exportCase}>
            <Download className="size-4" /> Export
          </Button>
          <Button variant="ghost" size="sm" onClick={del} className="text-destructive hover:text-destructive">
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      </div>

      {/* On-device investigation tools — pivot points from inside the case. */}
      <nav aria-label="Investigation tools" className="flex flex-wrap gap-2">
        {INVESTIGATE_LINKS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent-text"
          >
            <t.icon className="size-3.5" /> {t.label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Evidence */}
        <div className="space-y-4">
          <form onSubmit={addItem} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs">
            <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <Plus className="size-4 text-faint" /> Add evidence
            </h2>
            <div className="flex gap-2">
              <select
                aria-label="Evidence kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="note">Note</option>
                <option value="url">Link</option>
                <option value="observation">Observation</option>
              </select>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Label (optional)"
                maxLength={200}
                className="flex-1"
              />
            </div>
            <Textarea
              aria-label="Evidence content"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={20000}
              placeholder={kind === "url" ? "https://…" : "What you're recording…"}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="sm" disabled={busy || !body.trim()}>
              {busy ? "Adding…" : "Add — hash & log"}
            </Button>
          </form>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No evidence yet. Every item you add is SHA-256 hashed at intake.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => {
                const meta = KIND_META[it.kind] ?? KIND_META.note;
                const Icon = meta.icon;
                return (
                  <li key={it.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-faint">
                        <Icon className="size-3.5" /> {meta.label}
                        {it.title && <span className="font-normal normal-case text-foreground">· {it.title}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        aria-label="Remove item"
                        className="text-faint transition-colors hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {it.body && (
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-foreground">{it.body}</p>
                    )}
                    <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] text-faint" title={it.sha256}>
                      <Hash className="size-3" />
                      {it.sha256.slice(0, 24)}…
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          {entityGroups.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold text-foreground">
                  <ScanText className="size-4 text-faint" /> Entities
                </h2>
                <Link href="/tools/entities" className="inline-flex items-center gap-1 text-xs text-accent-text hover:underline">
                  Full extractor <ArrowRight className="size-3" />
                </Link>
              </div>
              <p className="mt-1 text-xs text-faint">Extracted on-device from the evidence text above.</p>
              <div className="mt-3 space-y-2.5">
                {entityGroups.map((g) => (
                  <div key={g.type}>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-faint">{g.label}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {g.items.map((e) => (
                        <span
                          key={`${e.type}:${e.value}`}
                          className="rounded-md border border-border bg-background/50 px-2 py-0.5 font-mono text-xs text-foreground"
                        >
                          {e.value}
                          {e.count > 1 && <span className="text-faint"> ×{e.count}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <CaseImageDedup />
        </div>

        {/* Chain of custody */}
        <aside>
          <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <History className="size-4 text-faint" /> Chain of custody
          </h2>
          <p className="mt-1 text-xs text-faint">
            Append-only — entries are never edited or reordered. <span className="text-muted-foreground">Export</span> writes the
            full log + evidence hashes to a JSON file for hand-off.
          </p>
          <ol className="mt-3 space-y-3 border-l border-border pl-4">
            {events.map((ev) => (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[1.36rem] top-1 size-2 rounded-full bg-accent" aria-hidden />
                <p className="text-sm font-medium text-foreground">{EVENT_LABEL[ev.type] ?? ev.type}</p>
                {ev.detail && <p className="break-words text-xs text-muted-foreground">{ev.detail}</p>}
                <p className="font-mono text-[10px] text-faint">{ev.at}</p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
