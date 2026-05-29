import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TOOL_GROUPS } from "@/lib/tools";

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Tools"
        description="Field, privacy, and verification tools. Anything marked offline runs entirely on this machine; the rest use an optional connection you control in Settings. Tip: press ⌘K to jump straight to any tool."
      />
      {TOOL_GROUPS.map((g) => (
        <section key={g.title} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">{g.title}</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.tools.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="surface-interactive group flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-text">
                    <t.icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-medium text-foreground group-hover:text-accent-text">
                      {t.label}
                      <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground text-pretty">{t.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
