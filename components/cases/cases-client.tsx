"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FolderSearch, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";

export type CaseSummary = {
  id: string;
  title: string;
  summary: string | null;
  status: "open" | "closed";
  item_count: number;
  updated_at: string;
};

export function CasesClient({ initial }: { initial: CaseSummary[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, summary }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not create case");
      router.push(`/cases/${data.case.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <Plus className="size-4 text-faint" /> New case
        </h2>
        <div className="space-y-1">
          <label htmlFor="case-title" className="text-xs font-medium text-muted-foreground">
            Title
          </label>
          <Input
            id="case-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Port logistics — vessel ownership"
            maxLength={200}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="case-summary" className="text-xs font-medium text-muted-foreground">
            Summary (optional)
          </label>
          <Textarea
            id="case-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            maxLength={2000}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy || !title.trim()}>
          {busy ? "Creating…" : "Create case"}
        </Button>
      </form>

      {initial.length === 0 ? (
        <EmptyState
          icon={FolderSearch}
          title="No cases yet"
          description="A case-file groups evidence — notes, links, observations — with a SHA-256 hash on every item and an append-only chain-of-custody log. Nothing leaves your machine."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {initial.map((c) => (
            <li key={c.id}>
              <Link
                href={`/cases/${c.id}`}
                className="surface-interactive block rounded-xl border border-border bg-card p-4 hover:border-accent/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="inline-flex items-center gap-2 font-display text-base font-semibold text-foreground">
                    <FileText className="size-4 text-faint" /> {c.title}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      c.status === "open" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                {c.summary && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.summary}</p>}
                <p className="mt-2 font-mono text-xs text-faint">
                  {c.item_count} item{c.item_count === 1 ? "" : "s"} · updated {c.updated_at.slice(0, 10)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
