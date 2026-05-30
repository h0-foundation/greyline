import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCase, getItems, getEvents } from "$server/db/repositories/cases";
import { CaseWorkspace } from "@/components/cases/case-workspace";

export const dynamic = "force-dynamic";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCase(id);
  if (!c) notFound();
  const items = getItems(id);
  const events = getEvents(id);

  return (
    <div className="space-y-6">
      <Link
        href="/cases"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-accent-text"
      >
        <ArrowLeft className="size-4" /> All cases
      </Link>
      <CaseWorkspace initial={{ case: c, items, events }} />
    </div>
  );
}
