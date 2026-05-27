import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SelfDoxxingChecklist } from "@/components/tools/self-doxxing";

export const metadata = {
  title: "Self-doxxing audit",
  description:
    "Find what the open internet reveals about you, then close it down. Runs entirely on this machine — Greyline performs no searches.",
};

export default function SelfDoxxingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Self-doxxing audit"
        description="Do to yourself what an attacker would. Generate search queries, track broker opt-outs, and keep the audit on a recurring cadence. Greyline performs no searches — everything runs on this machine."
      />

      <section className="flex items-start gap-3 rounded-xl border border-border bg-accent-subtle/40 p-5">
        <Eye className="mt-0.5 size-4 shrink-0 text-accent-text" />
        <p className="max-w-prose text-sm text-muted-foreground text-pretty">
          This audit is fully offline. Any identifiers you type are kept only in this browser and
          are never transmitted — Greyline builds copy-ready queries but runs none of them. External
          links open opt-out and search tools you operate directly.
        </p>
      </section>

      <SelfDoxxingChecklist />

      <p className="text-[11px] text-faint">
        Informational only — not legal advice. Opt-out processes and broker listings change; expect
        to repeat removals over time.
      </p>
    </div>
  );
}
