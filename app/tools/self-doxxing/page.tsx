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
        description="Do to yourself what an attacker would. Greyline performs no searches — these are steps you run yourself. Re-run every 3–12 months."
      />

      <section className="flex items-start gap-3 rounded-xl border border-border bg-accent-subtle/40 p-5">
        <Eye className="mt-0.5 size-4 shrink-0 text-accent-text" />
        <p className="max-w-prose text-sm text-muted-foreground text-pretty">
          This audit is fully offline. The checklist below is yours to work through; your progress
          is saved only in this browser. External links open opt-out and search tools you operate
          directly — Greyline never sees your queries or results.
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
