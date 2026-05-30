"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ScanText, Copy, ArrowRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { extractEntities, groupEntities } from "@/lib/ner";

/* Pure, on-device entity extraction over pasted text. Live as you type; nothing
 * is sent anywhere. Surfaces the structured identifiers an investigator pivots
 * on and links straight to the self-doxxing query generator. */

export function EntityExtractor() {
  const [text, setText] = useState("");
  const groups = useMemo(() => groupEntities(extractEntities(text)), [text]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <label htmlFor="ner-input" className="block text-sm font-medium text-foreground">
          Paste text to scan
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Runs entirely in your browser. Pattern-based, not a statistical model — exact for emails/phones/IBANs/
          handles/URLs/IPs/crypto; names &amp; orgs are heuristic candidates.
        </p>
        <Textarea
          id="ner-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Paste a document, message thread, or case notes…"
          className="mt-3 font-mono text-sm"
        />
      </div>

      {text.trim() && total === 0 && (
        <p className="text-sm text-faint">No entities found yet.</p>
      )}

      {groups.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {total} entit{total === 1 ? "y" : "ies"} across {groups.length} type{groups.length === 1 ? "" : "s"}.{" "}
            <Link href="/tools/self-doxxing" className="inline-flex items-center gap-1 text-accent-text hover:underline">
              Build OSINT queries <ArrowRight className="size-3.5" />
            </Link>
          </p>
          {groups.map((g) => (
            <section key={g.type} className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <h2 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
                <ScanText className="size-3.5" /> {g.label}
                <span className="font-mono text-[10px] text-faint">· {g.items.length}</span>
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {g.items.map((e) => (
                  <li key={`${e.type}:${e.value}`}>
                    <button
                      type="button"
                      onClick={() => copy(e.value)}
                      title="Copy"
                      className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-background/50 px-2 py-1 font-mono text-xs text-foreground hover:border-accent/40"
                    >
                      <span className="break-all">{e.value}</span>
                      {e.count > 1 && <span className="text-faint">×{e.count}</span>}
                      <Copy className="size-3 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
