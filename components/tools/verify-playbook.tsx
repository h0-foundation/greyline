"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, CheckCircle2, Camera, ShieldUser, Info, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIFT, MEDIA, SOURCE_PROTECTION } from "@/lib/verification";

/* SIFT verification + source-protection playbooks. The SIFT moves are an
 * interactive checklist; the media playbook cross-links the on-device chrono +
 * EXIF tools. Offline, educational, defensive. */

export function VerifyPlaybook() {
  const [done, setDone] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-accent-subtle/40 p-4 text-sm text-faint">
        <Info className="mt-0.5 size-4 shrink-0 text-accent-text" />
        <p>
          How investigators actually verify information and protect sources — distilled from SIFT, the Stanford lateral-reading
          research, Bellingcat&apos;s open-source methods, and CPJ / Freedom of the Press Foundation safety practice. Educational; runs
          entirely on this machine.
        </p>
      </div>

      {/* SIFT — interactive checklist */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
          <Search className="size-3.5" /> {SIFT.title}
        </h2>
        <p className="mt-2 text-sm text-faint">{SIFT.intro}</p>
        <ul className="mt-3 space-y-1.5">
          {SIFT.steps.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className="flex w-full items-start gap-2.5 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-accent-subtle/40"
              >
                <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", done.has(i) ? "text-success" : "text-faint/50")} />
                <span className="text-sm">
                  <span className={cn("font-medium", done.has(i) ? "text-faint line-through" : "text-foreground")}>{s.title}</span>
                  <span className="text-faint"> — {s.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-faint">{SIFT.source}</p>
      </section>

      {/* Media verification — cross-links the on-device tools */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
          <Camera className="size-3.5" /> {MEDIA.title}
        </h2>
        <p className="mt-2 text-sm text-faint">{MEDIA.intro}</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground marker:text-faint">
          {MEDIA.steps.map((s) => (
            <li key={s.title}>
              <span className="font-medium">{s.title}</span>
              <span className="text-faint"> — {s.detail}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/tools/chrono" className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent-subtle/50">
            Chronolocation lab <ArrowRight className="size-3.5" />
          </Link>
          <Link href="/tools/exif" className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent-subtle/50">
            EXIF stripper <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <p className="mt-3 text-[11px] text-faint">{MEDIA.source}</p>
      </section>

      {/* Source protection */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
          <ShieldUser className="size-3.5" /> {SOURCE_PROTECTION.title}
        </h2>
        <p className="mt-2 text-sm text-faint">{SOURCE_PROTECTION.intro}</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground marker:text-faint">
          {SOURCE_PROTECTION.steps.map((s) => (
            <li key={s.title}>
              <span className="font-medium">{s.title}</span>
              <span className="text-faint"> — {s.detail}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] text-faint">{SOURCE_PROTECTION.source}</p>
      </section>
    </div>
  );
}
