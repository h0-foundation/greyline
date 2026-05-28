"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock, LockOpen, Upload, FileText, Download, Trash2, ShieldCheck, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import type { VaultDoc } from "@/app/vault/page";

const CATEGORIES = ["passport", "visa", "insurance", "medical", "financial", "other"];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function VaultClient({
  initialized,
  initialDocs,
}: {
  initialized: boolean;
  initialDocs: VaultDoc[];
}) {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState<string | null>(null); // in-memory only
  const [docs, setDocs] = useState(initialDocs);
  const unlocked = passphrase !== null;

  async function refresh() {
    const res = await fetch("/api/vault");
    const data = await res.json();
    setDocs(data.docs);
  }

  async function openDoc(doc: VaultDoc) {
    if (!unlocked) return;
    const res = await fetch(`/api/vault/${doc.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase }),
    });
    if (!res.ok) {
      alert("Could not decrypt — wrong passphrase?");
      return;
    }
    const { data, mimeType, filename } = await res.json();
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function removeDoc(id: string) {
    if (!unlocked) return;
    await fetch(`/api/vault/${id}`, { method: "DELETE" });
    await refresh();
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Status banner — adapts to lock state */}
      <div
        className={`flex items-center justify-between rounded-xl border px-4 py-2.5 transition-colors duration-[var(--duration-default)] ${
          unlocked ? "border-success/30 bg-success/5" : "border-border bg-card"
        }`}
      >
        {unlocked ? (
          <>
            <span className="flex items-center gap-2 text-sm text-success">
              <LockOpen className="size-4" /> Vault unlocked
            </span>
            <Button variant="ghost" size="sm" onClick={() => setPassphrase(null)}>
              <Lock className="size-4" /> Lock
            </Button>
          </>
        ) : (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4 text-faint" />
            Vault locked
            {docs.length > 0 && (
              <span className="font-mono text-xs text-faint">
                · {docs.length} document{docs.length === 1 ? "" : "s"} on disk
              </span>
            )}
          </span>
        )}
      </div>

      {/* Unlock form — when locked */}
      {!unlocked && <UnlockCard initialized={initialized} onUnlock={setPassphrase} />}

      {/* Upload form — when unlocked */}
      {unlocked && (
        <UploadForm
          passphrase={passphrase as string}
          onUploaded={async () => {
            await refresh();
            router.refresh();
          }}
        />
      )}

      {/* Doc list — visible whenever there ARE docs. Titles render as redaction
          black bars when locked; on unlock the bars sweep left and the names
          appear. This is the vault's signature moment. */}
      {docs.length === 0 && unlocked && (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload a passport scan, visa, or insurance doc — it's encrypted with AES-256-GCM before it touches disk."
        />
      )}
      {docs.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="size-4 shrink-0 text-faint" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="redacted inline-block min-w-[8ch] max-w-[40ch] truncate text-sm font-medium text-foreground"
                      data-revealed={unlocked ? "true" : "false"}
                      aria-label={unlocked ? undefined : "Locked document"}
                    >
                      {d.name}
                    </span>
                    <Badge variant="secondary" className="capitalize">
                      {d.category}
                    </Badge>
                  </div>
                  <p className="font-mono text-xs text-faint">
                    {formatSize(d.file_size)} · {d.created_at?.slice(0, 10)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {unlocked && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDoc(d)}
                      aria-label="Decrypt and download"
                    >
                      <Download className="size-4" />
                    </Button>
                    <button
                      onClick={() => removeDoc(d.id)}
                      aria-label="Delete"
                      className="p-2 text-faint transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UnlockCard({
  initialized,
  onUnlock,
}: {
  initialized: boolean;
  onUnlock: (p: string) => void;
}) {
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (value.length < 8) {
      setError("Passphrase must be at least 8 characters.");
      return;
    }
    if (!initialized && value !== confirm) {
      setError("Passphrases don't match.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/vault/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase: value }),
    });
    setBusy(false);
    if (res.ok) onUnlock(value);
    else setError((await res.json()).error || "Could not unlock.");
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 shadow-xs">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent-subtle text-accent-text">
          <ShieldCheck className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
          {initialized ? "Unlock your vault" : "Create your vault"}
        </h2>
        <p className="mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
          {initialized
            ? "Enter your passphrase. It derives the encryption key (Argon2id) and is never stored."
            : "Choose a strong passphrase. It encrypts everything and can't be recovered if lost — there's no backdoor and no cloud."}
        </p>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div className="space-y-2">
          <Label htmlFor="vault-pass">Passphrase</Label>
          <Input
            id="vault-pass"
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            autoComplete="off"
          />
        </div>
        {!initialized && (
          <div className="space-y-2">
            <Label htmlFor="vault-confirm">Confirm passphrase</Label>
            <Input
              id="vault-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Working…" : initialized ? "Unlock" : "Create vault"}
        </Button>
      </form>
    </div>
  );
}

function UploadForm({
  passphrase,
  onUploaded,
}: {
  passphrase: string;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.set("file", file);
    fd.set("passphrase", passphrase);
    fd.set("name", name || file.name);
    fd.set("category", category);
    const res = await fetch("/api/vault", { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) {
      setFile(null);
      setName("");
      setCategory("other");
      onUploaded();
    } else setError((await res.json()).error || "Upload failed.");
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="vault-file">File</Label>
          <Input
            id="vault-file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vault-name">Name</Label>
          <Input
            id="vault-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="optional"
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vault-cat">Category</Label>
          <select
            id="vault-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm capitalize"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={busy || !file}>
          <Upload className="size-4" /> {busy ? "Encrypting…" : "Add"}
        </Button>
      </div>
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </p>
      )}
    </form>
  );
}
