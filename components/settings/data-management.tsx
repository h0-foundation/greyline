"use client";

import { useRef, useState } from "react";
import { Download, Upload, Trash2, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-5 shadow-xs">{children}</div>;
}

export function DataManagement() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  async function importBackup(file: File) {
    try {
      const payload = JSON.parse(await file.text());
      const res = await fetch("/api/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) setMsg({ tone: "ok", text: `Restored ${data.restored} records.` });
      else setMsg({ tone: "err", text: data.error || "Import failed." });
    } catch {
      setMsg({ tone: "err", text: "That file isn't a valid Greyline backup." });
    }
  }

  async function wipe() {
    const res = await fetch("/api/data", { method: "DELETE" });
    if (res.ok) setMsg({ tone: "ok", text: "All trips, checklists, logs, and vault records were wiped." });
    else setMsg({ tone: "err", text: "Wipe failed." });
    setConfirmWipe(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="size-4 text-accent-text" /> Backup &amp; restore
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Because nothing syncs to a cloud, a backup is the only way to move your data to another
          machine or recover it. Export a JSON snapshot of your trips, checklists, logs, and vault
          metadata. (Vault file contents stay encrypted on disk; back up the <code className="font-mono text-xs">data/</code> folder to move them.)
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <a href="/api/data" download><Download className="size-4" /> Export backup</a>
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Import backup
          </Button>
          <input
            ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ""; }}
          />
        </div>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <Trash2 className="size-4" /> Wipe local data
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Permanently delete all trips, destinations, checklists, surveillance and incident logs,
          and vault document records from this machine. Your preferences and connection settings are
          kept. This cannot be undone.
        </p>
        <div className="mt-4">
          {confirmWipe ? (
            <div className="flex items-center gap-2">
              <Button variant="destructive" onClick={wipe}>Yes, wipe everything</Button>
              <Button variant="ghost" onClick={() => setConfirmWipe(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setConfirmWipe(true)}>
              <Trash2 className="size-4" /> Wipe local data
            </Button>
          )}
        </div>
      </Card>

      {msg && (
        <p className={`flex items-center gap-1.5 text-sm ${msg.tone === "ok" ? "text-success" : "text-destructive"}`}>
          <AlertCircle className="size-4" /> {msg.text}
        </p>
      )}
    </div>
  );
}
